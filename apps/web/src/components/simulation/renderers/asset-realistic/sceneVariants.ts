/**
 * sceneVariants — maps a DetectorPlacement to the appropriate background scene.
 *
 * Each placement has a dedicated scene component that matches the camera's
 * physical position relative to the parking lane:
 *
 *   center_front   → CenterFrontScene   (parking entry, centered camera outside)
 *   center_back    → CenterBackScene    (parking exit,  centered camera inside)
 *   driver_front   → DriverFrontScene   (parking entry, camera on driver/left side)
 *   passenger_front→ PassengerFrontScene(parking entry, camera on passenger/right side)
 *   driver_back    → DriverBackScene    (parking exit,  camera on driver/left side)
 *   passenger_back → PassengerBackScene (parking exit,  camera on passenger/right side)
 *
 * Invariants enforced by the config system:
 *   incoming direction → only _front placements are valid
 *   away direction     → only _back  placements are valid
 * This function therefore never needs to handle cross-direction combinations.
 */
import type { DetectorPlacement } from '@plate-runner/shared';

export type SceneVariantKey =
  | 'center_front'
  | 'center_back'
  | 'driver_front'
  | 'passenger_front'
  | 'driver_back'
  | 'passenger_back';

export function getSceneVariant(placement: DetectorPlacement): SceneVariantKey {
  return placement as SceneVariantKey;
}
