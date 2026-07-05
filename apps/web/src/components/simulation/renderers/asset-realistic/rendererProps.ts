import type { SimulationConfig } from '@plate-runner/shared';
import type { DepthValues } from '../../../../utils/depth';
import type { SimulationPhase } from '../../../../hooks/useSimulation';

export interface SceneRendererProps {
  config: SimulationConfig;
  vehicleT: number;
  vehicleDepth: DepthValues;
  gateDepth: DepthValues;
  gateOpen: boolean;
  phase: SimulationPhase;
  vehicleBehindGate: boolean;
  /**
   * Visual QA: when true, draws the plate anchor bounding rect, centre
   * crosshair, and per-view label as an SVG overlay.
   * Must be false/absent in camera mode.
   */
  showAnchorOverlay?: boolean;
  /**
   * Visual QA: when true, draws the motion path curve (far→read→gate→exit),
   * key point labels, and current position marker.
   * Must be false/absent in camera mode.
   */
  showMotionPathOverlay?: boolean;
}
