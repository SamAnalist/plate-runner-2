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
 * auto_open     — Gate opens automatically when vehicle approaches.
 * wait_for_signal — Gate stays closed; vehicle stops and waits for a manual/API signal.
 * hidden        — Gate is not rendered in the scene.
 */
export type GateMode = 'auto_open' | 'wait_for_signal' | 'hidden';

export type VehicleColor = 'blue' | 'white' | 'black' | 'silver' | 'red' | 'green';

export interface SimulationConfig {
  plate: string;
  direction: Direction;
  detectorPlacement: DetectorPlacement;
  gateMode: GateMode;
  speed: number; // 1–10
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
  speed: 5,
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
