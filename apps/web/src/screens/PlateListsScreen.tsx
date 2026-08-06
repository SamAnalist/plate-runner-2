import type { PlateListsControls } from '../features/lists/usePlateLists';
import { PlateListsPanel } from '../components/controls/PlateListsPanel';

interface PlateListsScreenProps {
  plateLists: PlateListsControls;
  onNavigateToLocal: () => void;
}

export function PlateListsScreen({ plateLists, onNavigateToLocal }: PlateListsScreenProps) {
  const withNavigateOnRun: PlateListsControls = {
    ...plateLists,
    runList: (id: string) => {
      onNavigateToLocal();
      return plateLists.runList(id);
    },
  };

  return (
    <div className="px-6 py-6 max-w-3xl">
      <div className="mb-4">
        <h1 className="text-sm font-mono font-bold text-white/70 uppercase tracking-widest">
          Plate Lists
        </h1>
        <p className="text-xs text-white/35 font-mono mt-1">
          Create, import, export, and run saved sets of plates.
        </p>
      </div>
      <PlateListsPanel {...withNavigateOnRun} />
    </div>
  );
}
