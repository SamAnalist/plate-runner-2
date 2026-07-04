import type { SceneRendererProps } from './types';
import { Road } from '../Road';
import { Vehicle } from '../Vehicle';
import { Gate } from '../Gate';
import { SCENE_W, SCENE_H, VP_Y } from '../../../utils/depth';

export function ClassicSvgRenderer({
  config,
  vehicleT,
  vehicleDepth,
  gateDepth,
  gateOpen,
  vehicleBehindGate,
}: SceneRendererProps) {
  return (
    <>
      <defs>
        <linearGradient id="cSkyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#060810" />
          <stop offset="55%"  stopColor="#0d1728" />
          <stop offset="100%" stopColor="#1a2a3e" />
        </linearGradient>
        <radialGradient id="cHorizGlow" cx="50%" cy="100%" r="60%">
          <stop offset="0%"   stopColor="#1e4a7a" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#0d1728" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="cVignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stopColor="transparent" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="url(#cSkyGrad)" />
      <rect x={0} y={VP_Y - 40} width={SCENE_W} height={120} fill="url(#cHorizGlow)" />
      <line x1={0} y1={VP_Y + 2} x2={SCENE_W} y2={VP_Y + 2} stroke="#2a3a50" strokeWidth={1} opacity={0.6} />
      <Road />
      {vehicleBehindGate ? (
        <>
          <Vehicle config={config} vehicleT={vehicleT} vehicleDepth={vehicleDepth} />
          <Gate gateDepth={gateDepth} gateOpen={gateOpen} gateMode={config.gateMode} />
        </>
      ) : (
        <>
          <Gate gateDepth={gateDepth} gateOpen={gateOpen} gateMode={config.gateMode} />
          <Vehicle config={config} vehicleT={vehicleT} vehicleDepth={vehicleDepth} />
        </>
      )}
      <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="url(#cVignette)" pointerEvents="none" />
    </>
  );
}
