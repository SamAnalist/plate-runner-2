import { useState, useRef, useCallback, useEffect } from 'react';
import type { SimulationConfig } from '@plate-runner/shared';
import { GATE_T, READING_T_INCOMING, READING_T_AWAY } from '../utils/depth';
import { POV_EXIT_T } from '../components/simulation/renderers/asset-realistic/viewMotionPaths';

/**
 * Simulation phase state machine:
 *
 *   idle
 *     └─(start)──► running
 *                    │
 *                    ├─(auto_open, gate closed, reaches READING_T)──► stopped_at_gate
 *                    │    └─(after stopBeforeOpenMs)──► gate_opening
 *                    │                                    └─(after delayAfterOpenMs)──► running ──► done
 *                    │
 *                    ├─(wait_for_signal, gate closed, reaches READING_T)──► waiting_for_signal
 *                    │    └─(openGate() / Send Signal pressed)──► gate_opening
 *                    │                                              └─(after delayAfterOpenMs)──► running ──► done
 *                    │
 *                    └─(hidden OR gate initially open, passes through)──► done
 */
export type SimulationPhase =
  | 'idle'
  | 'running'
  | 'stopped_at_gate'    // auto_open: stopped, timer counting down before arm rises
  | 'waiting_for_signal' // wait_for_signal: stopped, waiting for Send Signal button
  | 'gate_opening'       // arm is rising; timer counting down before vehicle resumes
  | 'done';

export interface SimulationState {
  phase: SimulationPhase;
  /** 0.0 = vanishing point (far), 1.0 = near edge of scene */
  vehicleT: number;
  gateOpen: boolean;
  isRunning: boolean;
}

export interface SimulationControls {
  state: SimulationState;
  start: () => void;
  stop: () => void;
  reset: () => void;
  openGate: () => void;
  closeGate: () => void;
}

/**
 * Maps a speed value (1–10) to t-units/second using a linear range.
 * Each phase has its own [min, max] calibrated so speed=5 equals the
 * comfortable rate found during QA for the incoming direction.
 */
function phaseRate(speed: number, min: number, max: number): number {
  return min + ((speed - 1) / 9) * (max - min);
}

// ── Per-phase rate ranges ─────────────────────────────────────────────────────
// speed=5 → comfortable rate (QA baseline for incoming).
// speed=1 → min  |  speed=10 → max
//
// Initial / AfterStop: speed=5 ≈ 0.131 t/s  (old speedToRate(2))
const R_INITIAL    = { min: 0.033, max: 0.25 };
const R_AFTER_STOP = { min: 0.033, max: 0.25 };
// Stopping:           speed=5 ≈ 0.072 t/s  (old speedToRate(1))
const R_STOPPING   = { min: 0.018, max: 0.14 };
// Final/exit:         speed=5 ≈ 0.021 t/s  (old finalSpeedToRate(1))
const R_FINAL      = { min: 0.005, max: 0.04 };

/**
 * How many t-units before the reading stop point the deceleration zone begins.
 * Incoming: decel starts at READING_T_INCOMING - DECEL_OFFSET ≈ 0.36
 * Away:     decel starts at READING_T_AWAY     + DECEL_OFFSET
 */
const DECEL_OFFSET = 0.10;

/**
 * t below which the 'away' exit phase applies (car shrinking toward horizon).
 * Symmetric to POV_EXIT_T (0.75) on the away side.
 */
const FINAL_T_AWAY = 0.25;

/**
 * Returns the movement rate (t-units/second) for the current vehicle position.
 * Selects one of four phase-specific speeds from the direction-matching config.
 *
 *  incoming phases (t increasing):
 *    initial   — t < decelStart
 *    stopping  — decelStart ≤ t < readingT
 *    afterStop — readingT ≤ t < POV_EXIT_T
 *    final     — t ≥ POV_EXIT_T
 *
 *  away phases (t decreasing):
 *    initial   — t > decelStart
 *    stopping  — readingT < t ≤ decelStart
 *    afterStop — FINAL_T_AWAY < t ≤ readingT
 *    final     — t ≤ FINAL_T_AWAY
 */
function getPhaseRate(
  t: number,
  isIncoming: boolean,
  stopAtT: number,
  cfg: SimulationConfig,
): number {
  const sp = isIncoming ? cfg.speedIncoming : cfg.speedAway;
  if (isIncoming) {
    const decelStart = stopAtT - DECEL_OFFSET;
    if (t < decelStart)   return phaseRate(sp.initial,   R_INITIAL.min,    R_INITIAL.max);
    if (t < stopAtT)      return phaseRate(sp.stopping,  R_STOPPING.min,   R_STOPPING.max);
    if (t < POV_EXIT_T)   return phaseRate(sp.afterStop, R_AFTER_STOP.min, R_AFTER_STOP.max);
    return phaseRate(sp.final, R_FINAL.min, R_FINAL.max);
  } else {
    const decelStart = stopAtT + DECEL_OFFSET;
    if (t > decelStart)    return phaseRate(sp.initial,   R_INITIAL.min,    R_INITIAL.max);
    if (t > stopAtT)       return phaseRate(sp.stopping,  R_STOPPING.min,   R_STOPPING.max);
    if (t > FINAL_T_AWAY)  return phaseRate(sp.afterStop, R_AFTER_STOP.min, R_AFTER_STOP.max);
    return phaseRate(sp.final, R_FINAL.min, R_FINAL.max);
  }
}

function startT(direction: SimulationConfig['direction']): number {
  // Phase 0.8: start outside the visible frame so the vehicle enters naturally.
  // The POV opacity / Y-offset functions in viewMotionPaths.ts handle the
  // visual entry (fade-in from above the horizon) and exit (slide off bottom).
  return direction === 'incoming' ? 0.0 : 1.0;
}

/** Whether gate logic applies (visible + initially closed) */
function gateActive(config: SimulationConfig): boolean {
  return config.gateMode !== 'hidden' && config.gateInitialState === 'closed';
}

/** t-value at which the vehicle stops at the gate (direction-aware) */
function readingT(direction: SimulationConfig['direction']): number {
  return direction === 'incoming' ? READING_T_INCOMING : READING_T_AWAY;
}

export function useSimulation(config: SimulationConfig): SimulationControls {
  const [state, setState] = useState<SimulationState>({
    phase: 'idle',
    vehicleT: startT(config.direction),
    gateOpen: config.gateInitialState === 'open',
    isRunning: false,
  });

  const rafRef         = useRef<number | null>(null);
  // Two separate timer refs to prevent the useEffect cleanup from cancelling
  // the resume timer when the phase transitions from stopped_at_gate → gate_opening.
  /** Timer for the pre-open pause (stopBeforeOpenMs, set by useEffect) */
  const stopTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Timer for the post-open resume (850ms arm + delayAfterOpenMs, set by triggerGateOpen) */
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTimeRef    = useRef<number | null>(null);
  const stateRef       = useRef(state);
  const configRef      = useRef(config);
  stateRef.current     = state;
  configRef.current    = config;

  const cancelLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimeRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (stopTimerRef.current !== null) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (resumeTimerRef.current !== null) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cancelLoop();
    clearTimer();
    setState(s => ({ ...s, phase: 'idle', isRunning: false }));
  }, [cancelLoop, clearTimer]);

  const reset = useCallback(() => {
    cancelLoop();
    clearTimer();
    setState({
      phase: 'idle',
      vehicleT: startT(configRef.current.direction),
      gateOpen: configRef.current.gateInitialState === 'open',
      isRunning: false,
    });
  }, [cancelLoop, clearTimer]);

  const closeGate = useCallback(() => setState(s => ({ ...s, gateOpen: false })), []);


  // ── rAF loop ───────────────────────────────────────────────────────────────

  const animate = useCallback((time: number) => {
    if (lastTimeRef.current === null) lastTimeRef.current = time;
    const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = time;

    const cfg        = configRef.current;
    const isIncoming = cfg.direction === 'incoming';
    const stopAtT    = readingT(cfg.direction);
    const shouldStop = gateActive(cfg);

    setState(prev => {
      let t        = prev.vehicleT;
      let gateOpen = prev.gateOpen;
      const rate   = getPhaseRate(t, isIncoming, stopAtT, cfg);

      if (isIncoming) {
        // Stop at gate if gate is active (visible + closed)
        if (shouldStop && !gateOpen && t >= stopAtT && t < GATE_T + 0.01) {
          cancelLoop();
          const newPhase: SimulationPhase =
            cfg.gateMode === 'wait_for_signal' ? 'waiting_for_signal' : 'stopped_at_gate';
          return { ...prev, vehicleT: stopAtT, phase: newPhase, isRunning: false };
        }

        t = Math.min(t + rate * dt, 1);

        if (t >= 1) {
          cancelLoop();
          return { ...prev, vehicleT: t, gateOpen, phase: 'done', isRunning: false };
        }
      } else {
        // Away direction: vehicle moves from near → far
        if (shouldStop && !gateOpen && t <= stopAtT && t > GATE_T - 0.01) {
          cancelLoop();
          const newPhase: SimulationPhase =
            cfg.gateMode === 'wait_for_signal' ? 'waiting_for_signal' : 'stopped_at_gate';
          return { ...prev, vehicleT: stopAtT, phase: newPhase, isRunning: false };
        }

        t = Math.max(t - rate * dt, 0.02);

        if (t <= 0.02) {
          cancelLoop();
          return { ...prev, vehicleT: t, gateOpen, phase: 'done', isRunning: false };
        }
      }

      return { ...prev, vehicleT: t, gateOpen, phase: 'running' };
    });

    rafRef.current = requestAnimationFrame(animate);
  }, [cancelLoop]);

  // ── Gate opening sequence ──────────────────────────────────────────────────

  /** Called when the gate arm finishes rising + delayAfterOpenMs has elapsed.
   *  Resumes the rAF movement loop. */
  const resumeAfterGate = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'running', isRunning: true }));
    rafRef.current = requestAnimationFrame(animate);
  }, [animate]);

  /** Opens the gate visually and schedules vehicle resume.
   *  gateOpenDurationMs is fixed at 850ms (Framer Motion arm animation).
   *  Vehicle resumes after arm finishes + delayAfterOpenMs.
   *  Uses resumeTimerRef (NOT stopTimerRef) so the useEffect cleanup for the
   *  stopped_at_gate phase does not accidentally cancel the resume timer. */
  const triggerGateOpen = useCallback(() => {
    const cfg = configRef.current;
    const ARM_ANIMATION_MS = 850;
    const resumeDelay = ARM_ANIMATION_MS + cfg.delayAfterOpenMs;

    setState(prev => ({ ...prev, gateOpen: true, phase: 'gate_opening' }));
    resumeTimerRef.current = setTimeout(resumeAfterGate, resumeDelay);
  }, [resumeAfterGate]);

  /**
   * openGate — dual purpose:
   *   1. While waiting_for_signal → triggers the full gate-open → resume sequence
   *   2. Any other time → just opens the arm visually (manual override)
   */
  const openGate = useCallback(() => {
    const phase = stateRef.current.phase;
    if (phase === 'waiting_for_signal') {
      triggerGateOpen();
    } else {
      setState(s => ({ ...s, gateOpen: true }));
    }
  }, [triggerGateOpen]);

  // ── Start ──────────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    cancelLoop();
    clearTimer();
    const cfg = configRef.current;
    const cur = stateRef.current;

    const initialT =
      cur.phase === 'done' || cur.phase === 'stopped_at_gate' || cur.phase === 'waiting_for_signal'
        ? startT(cfg.direction)
        : cur.vehicleT;

    const initialGateOpen = cfg.gateInitialState === 'open' || cfg.gateMode === 'hidden';

    setState({
      phase: 'running',
      vehicleT: initialT,
      gateOpen: initialGateOpen,
      isRunning: true,
    });

    rafRef.current = requestAnimationFrame(animate);
  }, [cancelLoop, clearTimer, animate]);

  // ── Auto-open timer: fires when phase becomes stopped_at_gate ─────────────

  useEffect(() => {
    if (state.phase !== 'stopped_at_gate') return;
    // Only auto_open mode uses this timer (wait_for_signal uses button)
    if (configRef.current.gateMode !== 'auto_open') return;

    const ms = configRef.current.stopBeforeOpenMs;
    stopTimerRef.current = setTimeout(triggerGateOpen, ms);

    // Cleanup only cancels the stop timer — NOT the resume timer.
    // If we cancelled resumeTimerRef here, the vehicle would never resume
    // because this cleanup fires when phase changes to gate_opening (right
    // after triggerGateOpen sets the resume timer).
    return () => {
      if (stopTimerRef.current !== null) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
    };
  }, [state.phase, triggerGateOpen]);

  // ── Reset when direction changes ───────────────────────────────────────────
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.direction]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => { cancelLoop(); clearTimer(); }, [cancelLoop, clearTimer]);

  return { state, start, stop, reset, openGate, closeGate };
}

// Re-export for convenience in components
export { READING_T_INCOMING, READING_T_AWAY };
