import type { ExecutionHistoryControls } from '../features/history/useExecutionHistory';
import { ExecutionHistoryPanel } from '../components/controls/ExecutionHistoryPanel';

export function ExecutionHistoryScreen({ history }: { history: ExecutionHistoryControls }) {
  return (
    <div className="px-6 py-6 max-w-3xl">
      <div className="mb-4">
        <h1 className="text-sm font-mono font-bold text-white/70 uppercase tracking-widest">
          Execution History
        </h1>
        <p className="text-xs text-white/35 font-mono mt-1">
          A record of every past Plate List run.
        </p>
      </div>
      <ExecutionHistoryPanel history={history} />
    </div>
  );
}
