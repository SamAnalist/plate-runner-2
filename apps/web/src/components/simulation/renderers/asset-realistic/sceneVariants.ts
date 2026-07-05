/**
 * sceneVariants — maps a DetectorPlacement to the appropriate background scene.
 *
 * center_front → CenterFrontScene  (parking entry, camera outside facing in)
 * center_back  → CenterBackScene   (parking exit,  camera inside facing out)
 * all others   → GenericScene      (driver/passenger — generic parking interior)
 */
import type { DetectorPlacement } from '@plate-runner/shared';

export type SceneVariantKey = 'center_front' | 'center_back' | 'generic';

export function getSceneVariant(placement: DetectorPlacement): SceneVariantKey {
  if (placement === 'center_front') return 'center_front';
  if (placement === 'center_back')  return 'center_back';
  return 'generic';
}
