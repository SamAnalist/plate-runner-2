import { useState, useRef, useCallback, useEffect } from 'react';
import type { SimulationConfig } from '@plate-runner/shared';
import { GATE_T, READING_T_INCOMING, READING_T_AWAY } from '../utils/depth';

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
  /** Freeze vehicle at a specific depth position (used by calibration mode) */
  holdAt: (t: number) => void;
}

/** Speed 1–10 → t-units per second */
function speedToRate(speed: number): number {
  return 0.07 + (speed - 1) * (0.55 / 9);
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

  const rafRef      = useRef<number | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const stateRef    = useRef(state);
  const configRef   = useRef(config);
  stateRef.current  = state;
  configRef.current = config;

  const cancelLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimeRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
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

  /** Freeze the vehicle at position t (used by calibration mode) */
  const holdAt = useCallback((t: number) => {
    cancelLoop();
    clearTimer();
    setState({
      phase: 'stopped_at_gate',
      vehicleT: t,
      gateOpen: false,
      isRunning: false,
    });
  }, [cancelLoop, clearTimer]);

  // ── rAF loop ───────────────────────────────────────────────────────────────

  const animate = useCallback((time: number) => {
    if (lastTimeRef.current === null) lastTimeRef.current = time;
    const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = time;

    const cfg        = configRef.current;
    const rate       = speedToRate(cfg.speed);
    const isIncoming = cfg.direction === 'incoming';
    const stopAtT    = readingT(cfg.direction);
    const shouldStop = gateActive(cfg);

    setState(prev => {
      let t        = prev.vehicleT;
      let gateOpen = prev.gateOpen;

      if (isIncoming) {
        // Stop at gate if gate is active (visible + closed)
        if (shouldStop && !gateOpen && t >= stopAtT && t < GATE_T + 0.01) {
          cancelLoop();
          const newPhase: SimulationPhase =
            cfg.gateMode === 'wait_for_signal' ? 'waiting_for_signal' : 'stopped_at_gate';
          return { ...prev, vehicleT: stopAtT, phase: newPhase, isRunning: false };
        }

        t = Math.min(t + rate * dt, 0.98);

        if (t >= 0.98) {
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
   *  Vehicle resumes after arm finishes + delayAfterOpenMs. */
  const triggerGateOpen = useCallback(() => {
    const cfg = configRef.current;
    const ARM_ANIMATION_MS = 850;
    const resumeDelay = ARM_ANIMATION_MS + cfg.delayAfterOpenMs;

    setState(prev => ({ ...prev, gateOpen: true, phase: 'gate_opening' }));
    timeoutRef.current = setTimeout(resumeAfterGate, resumeDelay);
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
    timeoutRef.current = setTimeout(triggerGateOpen, ms);

    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, [state.phase, triggerGateOpen]);

  // ── Reset when direction changes ───────────────────────────────────────────
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.direction]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => { cancelLoop(); clearTimer(); }, [cancelLoop, clearTimer]);

  return { state, start, stop, reset, openGate, closeGate, holdAt };
}

// Re-export for convenience in components
export { READING_T_INCOMING, READING_T_AWAY };
