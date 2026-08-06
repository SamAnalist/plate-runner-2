import type { PlateList } from '@plate-runner/shared';
import type { RemoteControllerControls } from '../features/controller/useRemoteController';
import { ControllerModePanel } from '../components/controls/ControllerModePanel';

interface ControllerModeScreenProps {
  controller: RemoteControllerControls;
  localLists: PlateList[];
}

export function ControllerModeScreen({ controller, localLists }: ControllerModeScreenProps) {
  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="text-sm font-mono font-bold text-white/70 uppercase tracking-widest">
          Controller Mode
        </h1>
        <p className="text-xs text-white/35 font-mono mt-1">
          Control a paired Display from this computer — pair, then send plates, queues, and remote commands.
        </p>
      </div>
      <ControllerModePanel controller={controller} localLists={localLists} />
    </div>
  );
}
