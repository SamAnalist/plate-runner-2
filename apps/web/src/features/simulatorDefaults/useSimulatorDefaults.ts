import { useCallback, useState } from 'react';
import {
  DIRECTIONS,
  DETECTOR_PLACEMENTS,
  VEHICLE_COLORS,
  VEHICLE_TYPES,
  GATE_MODES,
  GATE_INITIAL_STATES,
  SPEED_PRESETS,
  isPlacementAllowedForDirection,
  remapPlacementForDirection,
  DEFAULT_CONFIG,
  type Direction,
  type DetectorPlacement,
  type VehicleColor,
  type VehicleType,
  type GateMode,
  type GateInitialState,
  type SpeedPreset,
  type SimulationConfig,
  speedPhasesForPreset,
} from '@plate-runner/shared';

/**
 * What a fresh run of the simulator starts with — persisted independently
 * of the live SimulationConfig (which resets to this every reload). Editable
 * from Settings so a deployment doesn't have to re-pick direction/color/gate
 * timings every time the page reloads.
 */
export interface SimulatorDefaults {
  direction: Direction;
  detectorPlacement: DetectorPlacement;
  vehicleColor: VehicleColor;
  vehicleType: VehicleType;
  speedPreset: SpeedPreset;
  gateMode: GateMode;
  gateInitialState: GateInitialState;
  stopBeforeOpenMs: number;
  delayAfterOpenMs: number;
  updatedAt: string;
}

export const SIMULATOR_DEFAULTS_STORAGE_KEY = 'plate-runner:simulator-defaults:v1';

export const FACTORY_SIMULATOR_DEFAULTS: SimulatorDefaults = {
  direction: DEFAULT_CONFIG.direction,
  detectorPlacement: DEFAULT_CONFIG.detectorPlacement,
  vehicleColor: DEFAULT_CONFIG.vehicleColor,
  vehicleType: DEFAULT_CONFIG.vehicleType,
  speedPreset: DEFAULT_CONFIG.speedPreset,
  gateMode: DEFAULT_CONFIG.gateMode,
  gateInitialState: DEFAULT_CONFIG.gateInitialState,
  stopBeforeOpenMs: DEFAULT_CONFIG.stopBeforeOpenMs,
  delayAfterOpenMs: DEFAULT_CONFIG.delayAfterOpenMs,
  updatedAt: new Date(0).toISOString(),
};

function sanitize(raw: unknown): SimulatorDefaults {
  if (typeof raw !== 'object' || raw === null) return FACTORY_SIMULATOR_DEFAULTS;
  const obj = raw as Record<string, unknown>;

  const direction = DIRECTIONS.includes(obj.direction as Direction)
    ? (obj.direction as Direction) : FACTORY_SIMULATOR_DEFAULTS.direction;

  const rawPlacement = DETECTOR_PLACEMENTS.includes(obj.detectorPlacement as DetectorPlacement)
    ? (obj.detectorPlacement as DetectorPlacement) : FACTORY_SIMULATOR_DEFAULTS.detectorPlacement;
  const detectorPlacement = isPlacementAllowedForDirection(direction, rawPlacement)
    ? rawPlacement : remapPlacementForDirection(rawPlacement, direction);

  return {
    direction,
    detectorPlacement,
    vehicleColor: VEHICLE_COLORS.includes(obj.vehicleColor as VehicleColor)
      ? (obj.vehicleColor as VehicleColor) : FACTORY_SIMULATOR_DEFAULTS.vehicleColor,
    vehicleType: VEHICLE_TYPES.includes(obj.vehicleType as VehicleType)
      ? (obj.vehicleType as VehicleType) : FACTORY_SIMULATOR_DEFAULTS.vehicleType,
    speedPreset: SPEED_PRESETS.includes(obj.speedPreset as SpeedPreset)
      ? (obj.speedPreset as SpeedPreset) : FACTORY_SIMULATOR_DEFAULTS.speedPreset,
    gateMode: GATE_MODES.includes(obj.gateMode as GateMode)
      ? (obj.gateMode as GateMode) : FACTORY_SIMULATOR_DEFAULTS.gateMode,
    gateInitialState: GATE_INITIAL_STATES.includes(obj.gateInitialState as GateInitialState)
      ? (obj.gateInitialState as GateInitialState) : FACTORY_SIMULATOR_DEFAULTS.gateInitialState,
    stopBeforeOpenMs: typeof obj.stopBeforeOpenMs === 'number' && Number.isFinite(obj.stopBeforeOpenMs)
      ? obj.stopBeforeOpenMs : FACTORY_SIMULATOR_DEFAULTS.stopBeforeOpenMs,
    delayAfterOpenMs: typeof obj.delayAfterOpenMs === 'number' && Number.isFinite(obj.delayAfterOpenMs)
      ? obj.delayAfterOpenMs : FACTORY_SIMULATOR_DEFAULTS.delayAfterOpenMs,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
  };
}

export function loadSimulatorDefaults(): SimulatorDefaults {
  try {
    const raw = localStorage.getItem(SIMULATOR_DEFAULTS_STORAGE_KEY);
    if (!raw) return FACTORY_SIMULATOR_DEFAULTS;
    return sanitize(JSON.parse(raw));
  } catch {
    return FACTORY_SIMULATOR_DEFAULTS;
  }
}

function saveSimulatorDefaults(defaults: SimulatorDefaults): void {
  try {
    localStorage.setItem(SIMULATOR_DEFAULTS_STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // localStorage unavailable — edits just won't survive a reload, non-fatal.
  }
}

/** Seeds a fresh SimulationConfig (plate/queue-related fields untouched) from persisted defaults — used once at app boot. */
export function applySimulatorDefaults(base: SimulationConfig, defaults: SimulatorDefaults): SimulationConfig {
  const speedPhases = defaults.speedPreset === 'advanced' ? base.speedIncoming : speedPhasesForPreset(defaults.speedPreset);
  return {
    ...base,
    direction: defaults.direction,
    detectorPlacement: defaults.detectorPlacement,
    vehicleColor: defaults.vehicleColor,
    vehicleType: defaults.vehicleType,
    speedPreset: defaults.speedPreset,
    speedIncoming: speedPhases,
    speedAway: speedPhases,
    gateMode: defaults.gateMode,
    gateInitialState: defaults.gateInitialState,
    stopBeforeOpenMs: defaults.stopBeforeOpenMs,
    delayAfterOpenMs: defaults.delayAfterOpenMs,
  };
}

export interface SimulatorDefaultsControls {
  settings: SimulatorDefaults;
  updateSettings: (partial: Partial<Omit<SimulatorDefaults, 'updatedAt'>>) => void;
  resetSettings: () => void;
}

export function useSimulatorDefaults(): SimulatorDefaultsControls {
  const [settings, setSettings] = useState<SimulatorDefaults>(() => loadSimulatorDefaults());

  const updateSettings = useCallback((partial: Partial<Omit<SimulatorDefaults, 'updatedAt'>>) => {
    setSettings(prev => {
      const next = sanitize({ ...prev, ...partial, updatedAt: new Date().toISOString() });
      saveSimulatorDefaults(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const next = { ...FACTORY_SIMULATOR_DEFAULTS, updatedAt: new Date().toISOString() };
    saveSimulatorDefaults(next);
    setSettings(next);
  }, []);

  return { settings, updateSettings, resetSettings };
}
