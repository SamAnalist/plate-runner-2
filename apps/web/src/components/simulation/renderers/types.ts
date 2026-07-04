import type { SimulationConfig } from '@plate-runner/shared';
import type { DepthValues } from '../../../utils/depth';
import type { SimulationPhase } from '../../../hooks/useSimulation';

export type VisualStyle =
  | 'classic'
  | 'realistic'
  | 'gate-camera'
  | 'overhead'
  | 'cinematic';

export const VISUAL_STYLE_LABELS: Record<VisualStyle, string> = {
  classic:         'Classic SVG',
  realistic:       'Realistic 2D',
  'gate-camera':   'Gate Camera',
  overhead:        'Overhead 2.5D',
  cinematic:       'Cinematic Night',
};

export interface SceneRendererProps {
  config: SimulationConfig;
  vehicleT: number;
  vehicleDepth: DepthValues;
  gateDepth: DepthValues;
  gateOpen: boolean;
  phase: SimulationPhase;
  vehicleBehindGate: boolean;
}
