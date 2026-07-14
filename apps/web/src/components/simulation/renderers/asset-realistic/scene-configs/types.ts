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
}

// ── Scene render config ────────────────────────────────────────────────────────

export interface SceneRenderConfig {
  /** Direction of traffic flow for this camera POV */
  direction: 'incoming' | 'away';
  vehicle: SceneVehicleMotionConfig;
  gate: SceneGateConfig;
}
