/**
 * scene-configs/types.ts — Type definitions for per-scene render configuration.
 *
 * Each of the six DetectorPlacement values has its own SceneRenderConfig that
 * specifies vehicle motion, gate placement, and gate arm behaviour.
 *
 * This lets diagonal scenes (driver_front, passenger_front) define genuinely
 * diagonal vehicle paths and accurate gate positions, while center/back scenes
 * keep their current symmetric behaviour — all from a single lookup.
 */

// ── Speed range ───────────────────────────────────────────────────────────────

export interface SpeedRange {
  /** Minimum t-units/second (speed slider = 1) */
  min: number;
  /** Maximum t-units/second (speed slider = 10) */
  max: number;
}

export interface SceneSpeedConfig {
  initial:   SpeedRange;  // far from gate, normal approach
  stopping:  SpeedRange;  // decelerating toward readingT
  afterStop: SpeedRange;  // resumed after gate opens
  final:     SpeedRange;  // exit / receding to horizon
}

// ── Car scale ─────────────────────────────────────────────────────────────────

export interface SceneCarScaleConfig {
  initial:   number;  // horizon → decel zone
  stopping:  number;  // decel zone → gate stop
  atGate:    number;  // stopped at gate
  afterStop: number;  // gate opens → exit/final
  final:     number;  // exit slide-out / receding
}

// ── Vehicle motion ─────────────────────────────────────────────────────────────

export interface SceneVehicleMotionConfig {
  /** t where the car first appears from the horizon (entry spawn point) */
  spawnT: number;
  /** t where the car stops for plate reading (gate is closed) */
  readingT: number;
  /** t of gate visual position — also the vehicleBehindGate z-order threshold */
  gateT: number;
  /** Deceleration zone (t-units): car starts slowing this far before readingT */
  decelOffset: number;
  /**
   * t below which the 'final' speed phase applies (away direction only).
   * Below this t the car recedes toward the horizon at its final (slow) speed.
   * Set to 0 for incoming scenes — never reached in normal flow.
   */
  finalT: number;
  /**
   * Vehicle center X at t≈0 (vanishing-point depth — car tiny, far from camera).
   * For diagonal scenes this is the road center at the horizon; for centered
   * scenes it equals VP_X (400).
   */
  xFar: number;
  /**
   * Vehicle center X at t≈1 (near edge — car large, close to camera).
   * For diagonal scenes this is the road center near the camera; for centered
   * scenes it equals VP_X (400).
   */
  xNear: number;
  /**
   * Optional rotation applied to the vehicle image (degrees, clockwise).
   * Applied around the car's own center. 0 = no rotation (default).
   * Use small values (±5–15°) to tilt the car to match the road diagonal.
   */
  rotationDeg?: number;
  /**
   * When true, X interpolation uses linear easing instead of easeOut.
   * Use for diagonal scenes where the car should keep moving laterally
   * throughout the full path, not just at the start.
   * Default: false (easeOut — standard behaviour for center scenes).
   */
  linearMotion?: boolean;
  /**
   * Override the Y position at t=0 (far/horizon).
   * Default: VP_Y (145) — the global horizon line.
   * Set to 0 for diagonal scenes whose road extends to the top of the frame,
   * so the car appears from the very top instead of the horizon strip.
   */
  yFar?: number;
  /**
   * When true, the exit slide (after gateT) also moves X along the diagonal,
   * following the same slope as the main xFar→xNear path.
   * Use for diagonal scenes so the car continues moving diagonally off-screen
   * instead of dropping straight down.
   * Default: false.
   */
  exitDiagonal?: boolean;
  /**
   * Multiplier applied to the diagonal X offset during exit.
   * Values > 1 push the car further in the lateral direction.
   * Default: 1 (natural road slope).
   */
  exitDiagonalScale?: number;
  /**
   * When true, the entry slide (away direction, t descending through POV_ENTRY_T_AWAY)
   * also moves X along the diagonal so the car enters from the expected lateral side
   * rather than purely vertically.
   * Default: false.
   */
  entryDiagonal?: boolean;
  /**
   * Multiplier applied to the diagonal X offset during entry (away direction).
   * Default: 1 (natural road slope).
   */
  entryDiagonalScale?: number;
  /** Per-scene speed ranges for each animation phase */
  speed: SceneSpeedConfig;
  /** Per-scene car size multipliers for each animation phase */
  carScale: SceneCarScaleConfig;
}

// ── Gate ──────────────────────────────────────────────────────────────────────

export interface SceneGateConfig {
  /** t value where the gate arm is placed along the depth axis */
  t: number;
  /**
   * Explicit X for the right edge of the gate post (scene coordinates).
   * When defined, overrides `roadRight` computed from getDepthValues(t).
   * Required for scenes whose road geometry differs from the global depth model
   * (e.g. driver_front which has a diagonal road with a shifted VP).
   */
  explicitPostRightX?: number;
  /**
   * Direction the gate arm extends from its pivot.
   *   'left'  — arm sweeps leftward across the lane (standard parking barrier).
   *   'right' — arm sweeps rightward (reserved for future mirrored setups).
   * All current configs use 'left'.
   */
  armDirection: 'left' | 'right';
  /** Arm rotation in degrees when gate is fully open */
  openAngleDeg: number;
  /** Arm rotation in degrees when gate is fully closed (0 = horizontal) */
  closedAngleDeg: number;
  /**
   * Multiplier applied to arm length and post height.
   * Use when the gate depth (t) produces a roadWidth that is too small for
   * the scene's perspective (e.g. diagonal scenes where the gate sits far
   * from the camera). Default: 1 (natural road-width sizing).
   */
  armScale?: number;
}

// ── Scene render config ────────────────────────────────────────────────────────

export interface SceneRenderConfig {
  /** Direction of traffic flow for this camera POV */
  direction: 'incoming' | 'away';
  vehicle: SceneVehicleMotionConfig;
  gate: SceneGateConfig;
}
