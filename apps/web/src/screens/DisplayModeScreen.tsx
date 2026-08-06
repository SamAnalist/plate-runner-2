import type { SimulationConfig } from '@plate-runner/shared';
import type { SimulationControls } from '../hooks/useSimulation';
import type { DisplayCommandListenerControls } from '../features/display/useDisplayCommandListener';
import { SimulationScene } from '../components/simulation/SimulationScene';
import { DisplayModePanel } from '../components/controls/DisplayModePanel';
import { Button } from '../components/ui/Button';

interface DisplayModeScreenProps {
  config: SimulationConfig;
  simulation: SimulationControls;
  displayCommandListener: DisplayCommandListenerControls;
  onEnterFullscreen: () => void;
  onEnterCamera: () => void;
}

export function DisplayModeScreen({
  config,
  simulation,
  displayCommandListener,
  onEnterFullscreen,
  onEnterCamera,
}: DisplayModeScreenProps) {
  return (
    <div className="flex h-full">
      <div className="flex-1 flex items-center justify-center p-6 min-w-0">
        <SimulationScene config={config} simulation={simulation} />
      </div>
      <aside className="w-72 shrink-0 border-l border-white/8 overflow-y-auto">
        <div className="flex flex-col h-full bg-[#0f1117]">
          <div className="px-4 py-3 border-b border-white/8 shrink-0">
            <p className="text-xs font-mono font-bold text-white/60 uppercase tracking-widest">
              Display Mode
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <DisplayModePanel listener={displayCommandListener} />
          </div>
          <div className="px-4 py-3 border-t border-white/8 shrink-0 flex flex-col gap-1.5">
            <Button variant="ghost" tone="neutral" onClick={onEnterCamera}>
              ◉  Camera Mode
            </Button>
            <Button variant="ghost" tone="neutral" onClick={onEnterFullscreen}>
              ⛶  Fullscreen Scene
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
