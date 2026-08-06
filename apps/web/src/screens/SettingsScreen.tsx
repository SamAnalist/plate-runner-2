import type { ApiCommandListenerControls } from '../features/api/useApiCommandListener';
import { LocalApiPanel } from '../components/controls/LocalApiPanel';

export function SettingsScreen({ apiCommandListener }: { apiCommandListener: ApiCommandListenerControls }) {
  return (
    <div className="px-6 py-6 max-w-3xl">
      <div className="mb-4">
        <h1 className="text-sm font-mono font-bold text-white/70 uppercase tracking-widest">
          Settings / API
        </h1>
        <p className="text-xs text-white/35 font-mono mt-1">
          Configure API connection and local listener.
        </p>
      </div>
      <LocalApiPanel listener={apiCommandListener} />
      <div className="mt-6 pt-4 border-t border-white/8">
        <p className="text-[10px] font-mono text-white/20 leading-snug">
          Plate Runner v0.9.0 — Gate Behavior + POV Motion
        </p>
      </div>
    </div>
  );
}
