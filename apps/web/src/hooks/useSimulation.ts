import { useState, useRef, useCallback, useEffect } from 'react';
import type { SimulationConfig } from '@plate-runner/shared';
import { GATE_T, READING_T_INCOMING, READING_T_AWAY } from '../utils/depth';

export type SimulationPhase =
  | 'idle'
  | 'running'
  | 'at_gate'   // vehicle stopped at gate (wait_for_signal mode)
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
  return direction === 'incoming' ? 0.04 : 0.96;
}

/** Lead distance before gate at which auto_open triggers */
const GATE_OPEN_LEAD = 0.09;

export function useSimulation(config: SimulationConfig): SimulationControls {
  const [state, setState] = useState<SimulationState>({
    phase: 'idle',
    vehicleT: startT(config.direction),
    gateOpen: false,
    isRunning: false,
  });

  const rafRef      = useRef<number | null>(null);
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

  const stop = useCallback(() => {
    cancelLoop();
    setState(s => ({ ...s, phase: 'idle', isRunning: false }));
  }, [cancelLoop]);

  const reset = useCallback(() => {
    cancelLoop();
    setState({
      phase: 'idle',
      vehicleT: startT(configRef.current.direction),
      gateOpen: false,
      isRunning: false,
    });
  }, [cancelLoop]);

  const openGate  = useCallback(() => setState(s => ({ ...s, gateOpen: true  })), []);
  const closeGate = useCallback(() => setState(s => ({ ...s, gateOpen: false })), []);

  /** Freeze the vehicle at position t, entering at_gate phase */
  const holdAt = useCallback((t: number) => {
    cancelLoop();
    setState({
      phase: 'at_gate',
      vehicleT: t,
      gateOpen: false,
      isRunning: false,
    });
  }, [cancelLoop]);

  const animate = useCallback((time: number) => {
    if (lastTimeRef.current === null) lastTimeRef.current = time;
    const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = time;

    const cfg        = configRef.current;
    const rate       = speedToRate(cfg.speed);
    const isIncoming = cfg.direction === 'incoming';

    setState(prev => {
      let t        = prev.vehicleT;
      let gateOpen = prev.gateOpen;

      if (isIncoming) {
        // Trigger auto-open before vehicle reaches gate
        if (cfg.gateMode === 'auto_open' && !gateOpen && t >= GATE_T - GATE_OPEN_LEAD) {
          gateOpen = true;
        }

        // wait_for_signal: stop vehicle at reading position
        if (cfg.gateMode === 'wait_for_signal' && !gateOpen && t >= READING_T_INCOMING) {
          cancelLoop();
          return { ...prev, vehicleT: READING_T_INCOMING, phase: 'at_gate', isRunning: false };
        }

        t = Math.min(t + rate * dt, 0.98);

        if (t >= 0.98) {
          cancelLoop();
          return { ...prev, vehicleT: t, gateOpen, phase: 'done', isRunning: false };
        }
      } else {
        // Away direction: vehicle moves from near → far
        if (cfg.gateMode === 'auto_open' && !gateOpen && t <= GATE_T + GATE_OPEN_LEAD) {
          gateOpen = true;
        }

        if (cfg.gateMode === 'wait_for_signal' && !gateOpen && t <= READING_T_AWAY) {
          cancelLoop();
          return { ...prev, vehicleT: READING_T_AWAY, phase: 'at_gate', isRunning: false };
        }

        t = Math.max(t - rate * dt, 0.04);

        if (t <= 0.04) {
          cancelLoop();
          return { ...prev, vehicleT: t, gateOpen, phase: 'done', isRunning: false };
        }
      }

      return { ...prev, vehicleT: t, gateOpen, phase: 'running' };
    });

    rafRef.current = requestAnimationFrame(animate);
  }, [cancelLoop]);

  const start = useCallback(() => {
    cancelLoop();
    const cfg = configRef.current;
    const cur = stateRef.current;

    const initialT =
      cur.phase === 'done' || cur.phase === 'at_gate'
        ? startT(cfg.direction)
        : cur.vehicleT;

    const initialGateOpen = cfg.gateMode === 'auto_open' ? false : cur.gateOpen;

    setState({
      phase: 'running',
      vehicleT: initialT,
      gateOpen: initialGateOpen,
      isRunning: true,
    });

    rafRef.current = requestAnimationFrame(animate);
  }, [cancelLoop, animate]);

  // Reset when direction changes
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.direction]);

  // Cleanup on unmount
  useEffect(() => () => cancelLoop(), [cancelLoop]);

  return { state, start, stop, reset, openGate, closeGate, holdAt };
}

// Re-export for convenience in components
export { READING_T_INCOMING, READING_T_AWAY };
