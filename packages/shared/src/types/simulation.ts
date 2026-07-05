export type Direction = 'incoming' | 'away';

export type DetectorSide = 'driver' | 'center' | 'passenger';
export type DetectorFace = 'front' | 'back';

export type DetectorPlacement =
  | 'driver_front'
  | 'center_front'
  | 'passenger_front'
  | 'driver_back'
  | 'center_back'
  | 'passenger_back';

/**
 * auto_open       — Gate starts closed; vehicle stops, waits, gate opens automatically.
 * wait_for_signal — Gate starts closed; vehicle stops and waits for a manual/API signal.
 * hidden          — Gate is not rendered in the scene.
 */
export type GateMode = 'auto_open' | 'wait_for_signal' | 'hidden';

/**
 * Initial visual state of the gate arm at the start of a simulation run.
 *   open   — Arm starts raised (80°); vehicle passes without stopping.
 *   closed — Arm starts horizontal; gate behavior (auto_open / wait_for_signal) applies.
 */
export type GateInitialState = 'open' | 'closed';

export type VehicleColor = 'blue' | 'white' | 'black' | 'silver' | 'red' | 'green';

/**
 * Four phase-specific speed values (1–10) for a single direction.
 *   initial   — entry until the deceleration zone (approaching the gate)
 *   stopping  — deceleration zone just before the gate stop point
 *   afterStop — resuming after the gate opens
 *   final     — exit phase (POV slide-out / horizon recede)
 *
 * Speed 5 is calibrated to the visually comfortable rates found during QA.
 * Below 5 is slower, above 5 is faster.
 */
export interface SpeedPhases {
  initial:   number;
  stopping:  number;
  afterStop: number;
  final:     number;
}

export interface SimulationConfig {
  plate: string;
  direction: Direction;
  detectorPlacement: DetectorPlacement;
  /** Visibility and behavior mode of the gate. */
  gateMode: GateMode;
  /**
   * Initial state of the gate arm when a run starts.
   * Only applies when gateMode !== 'hidden'.
   *   open   — Arm starts raised; vehicle passes through without stopping.
   *   closed — Arm starts down; gateMode behavior (auto_open / wait_for_signal) is applied.
   */
  gateInitialState: GateInitialState;
  /**
   * How long (ms) the vehicle waits at the gate before the arm starts rising.
   * Only used when gateMode === 'auto_open' and gateInitialState === 'closed'.
   * Default: 2000ms.
   */
  stopBeforeOpenMs: number;
  /**
   * How long (ms) to wait after the gate arm finishes opening before the vehicle
   * resumes moving. Default: 400ms.
   */
  delayAfterOpenMs: number;
  /** Phase speeds for the incoming direction (car approaching camera). */
  speedIncoming: SpeedPhases;
  /** Phase speeds for the away direction (car receding from camera). */
  speedAway: SpeedPhases;
  vehicleColor: VehicleColor;
}

export interface ValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Focus zone for camera calibration.
 * All position/size values are in percentages of the simulation scene area (0–100).
 */
export interface FocusZoneConfig {
  enabled: boolean;
  showOverlay: boolean;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  borderColor: string;
  label: string;
}

export const DEFAULT_CONFIG: SimulationConfig = {
  plate: 'ABC123',
  direction: 'incoming',
  detectorPlacement: 'center_front',
  gateMode: 'auto_open',
  gateInitialState: 'closed',
  stopBeforeOpenMs: 2000,
  delayAfterOpenMs: 400,
  speedIncoming: { initial: 5, stopping: 5, afterStop: 5, final: 5 },
  speedAway:     { initial: 5, stopping: 5, afterStop: 5, final: 5 },
  vehicleColor: 'blue',
};

/**
 * Default focus zone calibrated to capture the license plate at the reading
 * position (vehicle stopped just before/after the gate) for all detector
 * placements and both directions.
 *
 * Geometry (800×500 scene):
 *   Incoming reading t≈0.46 → plate center ≈ (400, 272) → 50% / 54.4%
 *   Away    reading t≈0.58 → plate center ≈ (400, 306) → 50% / 61.2%
 *   Zone covers both: x=33–67%, y=47–71%
 */
export const DEFAULT_FOCUS_ZONE: FocusZoneConfig = {
  enabled: true,
  showOverlay: true,
  xPercent: 33,
  yPercent: 47,
  widthPercent: 34,
  heightPercent: 24,
  borderColor: '#22d3ee',
  label: 'CAMERA FOCUS',
};
