/**
 * getSceneConfig.ts — Resolver: DetectorPlacement → SceneRenderConfig.
 *
 * Single entry point for all per-scene configuration. Import this function
 * anywhere that needs to know how a specific camera placement behaves.
 *
 * Usage:
 *   const cfg = getSceneConfig('driver_front');
 *   cfg.vehicle.xFar   // diagonal road horizon X
 *   cfg.gate.t         // gate depth value
 *   cfg.gate.explicitPostRightX  // explicit gate post X (if any)
 */
import type { DetectorPlacement } from '@plate-runner/shared';
import type { SceneRenderConfig } from './types';
import { centerFrontConfig }     from './centerFront.config';
import { centerBackConfig }      from './centerBack.config';
import { driverFrontConfig }     from './driverFront.config';
import { passengerFrontConfig }  from './passengerFront.config';
import { driverBackConfig }      from './driverBack.config';
import { passengerBackConfig }   from './passengerBack.config';

const SCENE_CONFIG_MAP: Record<DetectorPlacement, SceneRenderConfig> = {
  center_front:    centerFrontConfig,
  center_back:     centerBackConfig,
  driver_front:    driverFrontConfig,
  passenger_front: passengerFrontConfig,
  driver_back:     driverBackConfig,
  passenger_back:  passengerBackConfig,
};

export function getSceneConfig(placement: DetectorPlacement): SceneRenderConfig {
  return SCENE_CONFIG_MAP[placement];
}

export type { SceneRenderConfig } from './types';
