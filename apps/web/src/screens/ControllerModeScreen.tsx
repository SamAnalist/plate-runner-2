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
      <ControllerModePanel controller={controller} localLists={localLists} />
    </div>
  );
}
