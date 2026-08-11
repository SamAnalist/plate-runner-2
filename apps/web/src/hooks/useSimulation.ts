import { useState, useRef, useCallback, useEffect } from 'react';
import type { SimulationConfig } from '@plate-runner/shared';
import { READING_T_INCOMING, READING_T_AWAY } from '../utils/depth';
import { getSceneConfig } from '../components/simulation/renderers/asset-realistic/scene-configs/getSceneConfig';
import type { SceneSpeedConfig } from '../components/simulation/renderers/asset-realistic/scene-configs/types';
import { createPausableTimers } from '../utils/pausableTimers';

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
  /** True while pause() has frozen motion/timers without changing phase. */
  isPaused: boolean;
}

export interface SimulationControls {
  state: SimulationState;
  start: () => void;
  stop: () => void;
  reset: () => void;
  openGate: () => void;
  closeGate: () => void;
  /** Freezes vehicle motion and any active gate timer in place. No-op if idle/done/already paused. */
  pause: () => void;
  /** Continues from exactly where pause() froze things. No-op if not paused or idle/done. */
  resume: () => void;
}

/**
 * Maps a speed value (1–10) to t-units/second using a linear range.
 * Each phase has its own [min, max] calibrated so speed=5 equals the
 * comfortable rate found during QA for the incoming direction.
 */
function phaseRate(speed: number, min: number, max: number): number {
  return min + ((speed - 1) / 9) * (max - min);
}


/**
 * Returns the movement rate (t-units/second) for the current vehicle position.
 * Selects one of four phase-specific speeds from the direction-matching config.
 *
 *  incoming phases (t increasing):
 *    initial   — t < decelStart
 *    stopping  — decelStart ≤ t < readingT
 *    afterStop — readingT ≤ t < gateT
 *    final     — t ≥ gateT
 *
 *  away phases (t decreasing):
 *    initial   — t > decelStart
 *    stopping  — readingT < t ≤ decelStart
 *    afterStop — finalT < t ≤ readingT
 *    final     — t ≤ finalT
 *
 * Instant switch at every boundary — no ramping/blending between phases.
 * All timing thresholds come from the per-scene config — no global constants.
 */
function getPhaseRate(
  t: number,
  isIncoming: boolean,
  stopAtT: number,
  decelOffset: number,
  gateT: number,
  finalT: number,
  speedSlider: { initial: number; stopping: number; afterStop: number; final: number },
  sceneSpeeds: SceneSpeedConfig,
): number {
  if (isIncoming) {
    const decelStart = stopAtT - decelOffset;
    if (t < decelStart) return phaseRate(speedSlider.initial,   sceneSpeeds.initial.min,   sceneSpeeds.initial.max);
    if (t < stopAtT)    return phaseRate(speedSlider.stopping,  sceneSpeeds.stopping.min,  sceneSpeeds.stopping.max);
    if (t < gateT)      return phaseRate(speedSlider.afterStop, sceneSpeeds.afterStop.min, sceneSpeeds.afterStop.max);
    return phaseRate(speedSlider.final, sceneSpeeds.final.min, sceneSpeeds.final.max);
  } else {
    const decelStart = stopAtT + decelOffset;
    if (t > decelStart) return phaseRate(speedSlider.initial,   sceneSpeeds.initial.min,   sceneSpeeds.initial.max);
    if (t > stopAtT)    return phaseRate(speedSlider.stopping,  sceneSpeeds.stopping.min,  sceneSpeeds.stopping.max);
    if (t > finalT)     return phaseRate(speedSlider.afterStop, sceneSpeeds.afterStop.min, sceneSpeeds.afterStop.max);
    return phaseRate(speedSlider.final, sceneSpeeds.final.min, sceneSpeeds.final.max);
  }
}

function startT(direction: SimulationConfig['direction']): number {
  return direction === 'incoming' ? 0.0 : 1.0;
}

/** Whether gate logic applies (visible + initially closed) */
function gateActive(config: SimulationConfig): boolean {
  return config.gateMode !== 'hidden' && config.gateInitialState === 'closed';
}


export function useSimulation(config: SimulationConfig): SimulationControls {
  const [state, setState] = useState<SimulationState>({
    phase: 'idle',
    vehicleT: startT(config.direction),
    gateOpen: config.gateInitialState === 'open',
    isRunning: false,
    isPaused: false,
  });

  const rafRef      = useRef<number | null>(null);
  /** Manages the two gate-related timers ('stopBeforeOpen', 'resumeAfterGate') so pause() can freeze them with remaining time preserved. */
  const timers       = useRef(createPausableTimers());
  const lastTimeRef = useRef<number | null>(null);
  /**
   * Smoothed velocity (t-units/sec). Each frame it approaches the target rate
   * via exponential decay: currentRate += (target - current) * (1 - e^(-dt/TAU)).
   * Reset to 0 when the car stops so post-gate resume always starts from rest.
   */
  const currentRateRef = useRef(0);
  /** Smoothing time constant in seconds. Lower = snappier. Higher = more inertia. */
  const RATE_TAU = 0.0001;

  const stateRef   = useRef(state);
  const configRef  = useRef(config);
  stateRef.current  = state;
  configRef.current = config;

  const cancelLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimeRef.current    = null;
    currentRateRef.current = 0;
  }, []);

  const stop = useCallback(() => {
    cancelLoop();
    timers.current.clearAll();
    setState(s => ({ ...s, phase: 'idle', isRunning: false, isPaused: false }));
  }, [cancelLoop]);

  const reset = useCallback(() => {
    cancelLoop();
    timers.current.clearAll();
    setState({
      phase: 'idle',
      vehicleT: startT(configRef.current.direction),
      gateOpen: configRef.current.gateInitialState === 'open',
      isRunning: false,
      isPaused: false,
    });
  }, [cancelLoop]);

  const closeGate = useCallback(() => setState(s => ({ ...s, gateOpen: false })), []);


  // ── rAF loop ───────────────────────────────────────────────────────────────

  const animate = useCallback((time: number) => {
    if (lastTimeRef.current === null) lastTimeRef.current = time;
    const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = time;

    const cfg        = configRef.current;
    const isIncoming = cfg.direction === 'incoming';
    const shouldStop = gateActive(cfg);

    const sceneConfig  = getSceneConfig(cfg.detectorPlacement);
    const sceneV       = sceneConfig.vehicle;
    const sceneGateT   = sceneConfig.gate.t;
    const stopAtT      = sceneV.readingT;
    const speedSlider  = isIncoming ? cfg.speedIncoming : cfg.speedAway;

    setState(prev => {
      let t        = prev.vehicleT;
      let gateOpen = prev.gateOpen;

      // Target rate from phase logic.
      // For 'away': hold afterStop speed for FINAL_PHASE_DELAY_MS after crossing finalT
      // before switching to final speed — prevents a hard jump at the phase boundary.
      const targetRate = getPhaseRate(t, isIncoming, stopAtT, sceneV.decelOffset, sceneGateT, sceneV.finalT, speedSlider, sceneV.speed);
      const alpha = 1 - Math.exp(-dt / RATE_TAU);
      currentRateRef.current += (targetRate - currentRateRef.current) * alpha;
      const rate = currentRateRef.current;

      if (isIncoming) {
        if (shouldStop && !gateOpen && t >= stopAtT && t < sceneGateT + 0.01) {
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
        if (shouldStop && !gateOpen && t <= stopAtT) {
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
  }, [cancelLoop, RATE_TAU]);

  // ── Gate opening sequence ──────────────────────────────────────────────────

  /** Called when the gate arm finishes rising + delayAfterOpenMs has elapsed.
   *  currentRateRef is already 0 from cancelLoop — the exponential smoothing
   *  will ramp velocity up from rest naturally on resume. */
  const resumeAfterGate = useCallback(() => {
    setState(prev => ({ ...prev, phase: 'running', isRunning: true }));
    rafRef.current = requestAnimationFrame(animate);
  }, [animate]);

  /** Opens the gate visually and schedules vehicle resume. */
  const triggerGateOpen = useCallback(() => {
    const cfg = configRef.current;
    const ARM_ANIMATION_MS = 850;
    const resumeDelay = ARM_ANIMATION_MS + cfg.delayAfterOpenMs;

    setState(prev => ({ ...prev, gateOpen: true, phase: 'gate_opening' }));
    timers.current.schedule('resumeAfterGate', resumeDelay, resumeAfterGate);
  }, [resumeAfterGate]);

  const openGate = useCallback(() => {
    // While paused, the signal is neither applied nor queued — the user must resume first.
    if (stateRef.current.isPaused) return;
    const phase = stateRef.current.phase;
    if (phase === 'waiting_for_signal') {
      triggerGateOpen();
    } else if (phase === 'running') {
      // Signal arrived before the vehicle reached its stop position — ignore it.
      // Setting gateOpen here would skip the stop check in animate() entirely
      // (t <= stopAtT would never freeze the vehicle), so the car blows through
      // the reading/gate position still at approach speed instead of easing out
      // of a proper stop — a jarring jump, not a smooth resume. The vehicle will
      // stop normally and reach 'waiting_for_signal'; send the signal again then.
    } else {
      setState(s => ({ ...s, gateOpen: true }));
    }
  }, [triggerGateOpen]);

  // ── Start ──────────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    cancelLoop();
    timers.current.clearAll();
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
      isPaused: false,
    });

    rafRef.current = requestAnimationFrame(animate);
  }, [cancelLoop, animate]);

  // ── Pause / Resume ─────────────────────────────────────────────────────────

  /** Freezes vehicle motion and any active gate timer in place. No-op if idle/done/already paused. */
  const pause = useCallback(() => {
    const cur = stateRef.current;
    if (cur.phase === 'idle' || cur.phase === 'done' || cur.isPaused) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // Discard the elapsed-time anchor so resume's first frame computes dt=0 (no jump).
    lastTimeRef.current = null;
    timers.current.pauseAll();
    setState(s => ({ ...s, isPaused: true }));
  }, []);

  /** Continues from exactly where pause() froze things. No-op if not paused or idle/done. */
  const resume = useCallback(() => {
    const cur = stateRef.current;
    if (!cur.isPaused || cur.phase === 'idle' || cur.phase === 'done') return;

    timers.current.resumeAll();
    // rAF only ever runs during 'running' — stopped_at_gate/gate_opening/waiting_for_signal
    // are driven purely by timers, already resumed above.
    if (cur.phase === 'running') {
      rafRef.current = requestAnimationFrame(animate);
    }
    setState(s => ({ ...s, isPaused: false }));
  }, [animate]);

  // ── Auto-open timer: fires when phase becomes stopped_at_gate ─────────────

  useEffect(() => {
    if (state.phase !== 'stopped_at_gate') return;
    if (configRef.current.gateMode !== 'auto_open') return;

    const ms = configRef.current.stopBeforeOpenMs;
    timers.current.schedule('stopBeforeOpen', ms, triggerGateOpen);

    return () => timers.current.clear('stopBeforeOpen');
  }, [state.phase, triggerGateOpen]);

  // ── Reset when direction changes ───────────────────────────────────────────
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.direction]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    const timerManager = timers.current;
    return () => { cancelLoop(); timerManager.clearAll(); };
  }, [cancelLoop]);

  return { state, start, stop, reset, openGate, closeGate, pause, resume };
}

// Re-export for convenience in components
export { READING_T_INCOMING, READING_T_AWAY };
