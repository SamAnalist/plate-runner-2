import type { PlateList } from '@plate-runner/shared';
import type { LocalSchedulerControls } from '../features/scheduler/useLocalScheduler';
import { SchedulerPanel } from '../components/controls/SchedulerPanel';

interface SchedulerScreenProps {
  scheduler: LocalSchedulerControls;
  lists: PlateList[];
  queueActive: boolean;
  onNavigateToLocal: () => void;
}

export function SchedulerScreen({ scheduler, lists, queueActive, onNavigateToLocal }: SchedulerScreenProps) {
  const withNavigateOnRun: LocalSchedulerControls = {
    ...scheduler,
    runNow: (id: string) => {
      onNavigateToLocal();
      return scheduler.runNow(id);
    },
  };

  return (
    <div className="px-6 py-6 max-w-3xl">
      <div className="mb-4">
        <h1 className="text-sm font-mono font-bold text-white/70 uppercase tracking-widest">
          Scheduler
        </h1>
        <p className="text-xs text-white/35 font-mono mt-1">
          Run saved Plate Lists automatically, on a schedule.
        </p>
      </div>
      <SchedulerPanel scheduler={withNavigateOnRun} lists={lists} queueActive={queueActive} />
    </div>
  );
}
