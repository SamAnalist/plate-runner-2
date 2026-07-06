/**
 * sceneParams.ts — single source of truth for all scene physics and layout values.
 *
 * Edit this file to change how the simulation looks and behaves.
 * All values are picked up automatically by the renderer, animation loop,
 * and scene components — no other files need to be touched.
 *
 * ── COORDINATE SYSTEM ────────────────────────────────────────────────────────
 *  t = depth parameter:  0.0 = vanishing point (far, tiny)
 *                        1.0 = near edge (large, close to camera)
 *
 *  Y position on screen: lerp(VP_Y, SCENE_H, t)
 *    VP_Y   ≈ 145px  (horizon line)
 *    SCENE_H = 500px (bottom of frame)
 *    t=0.42 → y≈290px  (upper-mid area)
 *    t=0.80 → y≈423px  (lower area)
 *    t=0.98 → y≈493px  (near bottom)
 *
 *  X position: VP_X (400) ± lateral offset
 *    xFar  = offset when car is far (tiny, near horizon)
 *    xNear = offset when car is near (large, close)
 *
 * ── SPEED RANGES ─────────────────────────────────────────────────────────────
 *  speed slider 1–10 maps linearly to [min, max] t-units per second.
 *  speed=5 is the calibrated "comfortable" rate from QA.
 *  Increase max to allow faster speeds; decrease min for a slower minimum.
 *
 * ── CAR SIZE (carScale) ───────────────────────────────────────────────────────
 *  Multiplier on top of the natural depth-based size at each phase.
 *  1.0 = natural depth size.   1.2 = 20% bigger.   0.8 = 20% smaller.
 *  Scale is interpolated smoothly between phase boundaries.
 */

// ─── INCOMING mode (center_front scene) ─────────────────────────────────────
// Car travels from horizon (t=0) toward camera, passes the gate, exits bottom.

export const INCOMING = {

  // ── Depth / Y positions ────────────────────────────────────────────────────
  /** Gate visual position. Also where the car starts the exit slide-out. */
  gateT: 0.99,

  /** Car stops here when gate is closed (just before the gate). */
  readingT: 0.93,

  /** Decel zone width: car starts slowing this many t-units before readingT. */
  decelOffset: 0.12,

  /** t at which the car first appears from the horizon (entry spawn). */
  spawnT: 0.3,

  // ── Car scale per phase ────────────────────────────────────────────────────
  // Multiplier on the natural depth size. Interpolated between phase boundaries.
  carScale: {
    initial:   1.1,  // entry from horizon → decel zone
    stopping:  1.1,  // decel zone → gate stop
    atGate:    1.1,  // while stopped at gate (reading position)
    afterStop: 1.1,  // resume after gate opens → gateT
    final:     2.7,  // exit slide-out (gateT → 1.0) — grows as car exits bottom
  },

  // ── Speed ranges per phase [min t/s, max t/s] ─────────────────────────────
  // speed slider 1 = min, speed slider 10 = max
  speed: {
    initial:   { min: 0.033, max: 0.30  },  // entry → decel zone
    stopping:  { min: 0.028, max: 0.40  },  // decel zone → gate stop
    afterStop: { min: 0.023, max: 0.20  },  // resume after gate opens → gateT
    final:     { min: 0.001, max: 0.008  },  // exit slide-out (gateT → 1.0)
  },

  // ── Lateral X offsets from VP_X (400) ─────────────────────────────────────
  // xFar  = X offset when car is at the horizon (tiny)
  // xNear = X offset when car is near (large)
  lateral: {
    center:    { xFar:  0, xNear:   0 },
    driver:    { xFar:  8, xNear:  75 },
    passenger: { xFar: -8, xNear: -75 },
  },
};

// ─── AWAY mode (center_back scene) ──────────────────────────────────────────
// Car travels from near (t=1) toward horizon, passes the gate, recedes.

export const AWAY = {

  // ── Depth / Y positions ────────────────────────────────────────────────────
  /** Gate visual position for the away scene (higher up = smaller t value). */
  gateT: 0.35,

  /** Car stops here when gate is closed. Must be > gateT so the car stops before the gate.
   *  Bigger = lower on screen (closer to camera). */
  readingT: 0.90,

  /** Decel zone width: car starts slowing this many t-units before readingT.
   *  0.10 = gradual, comfortable decel. */
  decelOffset: 0.05,

  /**
   * t at which the car finishes entering from the bottom of the frame.
   * Must be >= readingT + decelOffset to avoid conflicting with decel/stop.
   * 1.00 = no slide, car appears at natural depth position immediately.
   */
  entryT: 0.90,

  /**
   * t below which the final/exit phase applies (car receding toward horizon).
   * Below this t-value the "final" speed range is used.
   */
  finalT: 0.30,

  // ── Car scale per phase ────────────────────────────────────────────────────
  carScale: {
    initial:   1.4,  // natural depth size throughout
    stopping:  1.0,
    atGate:    1.0,
    afterStop: 1.0,
    final:     1.0,
  },

  // ── Speed ranges per phase [min t/s, max t/s] ─────────────────────────────
  speed: {
    initial:   { min: 0.01, max: 0.09 },  // entry → decel zone
    stopping:  { min: 0.01,  max: 0.09  },  // decel zone → gate stop
    afterStop: { min: 0.12, max: 0.4 },  // resume after gate opens → finalT
    final:     { min: 0.1, max: 0.2 },  // recede toward horizon (t → 0)
  },

  // ── Lateral X offsets from VP_X (400) ─────────────────────────────────────
  lateral: {
    center:    { xFar:  0, xNear:   0 },
    driver:    { xFar:  8, xNear:  75 },
    passenger: { xFar: -8, xNear: -75 },
  },
};
