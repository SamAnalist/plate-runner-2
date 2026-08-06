import type { ApiCommandListenerControls } from '../../features/api/useApiCommandListener';

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-white/35 uppercase tracking-[0.16em] mb-1.5">{children}</p>;
}

function SmallButton({
  onClick,
  disabled,
  children,
  tone = 'neutral',
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  tone?: 'neutral' | 'primary' | 'danger';
}) {
  const toneClasses: Record<string, string> = {
    neutral: 'border-white/12 text-white/55 hover:text-white/85 hover:border-white/25 bg-white/5',
    primary: 'border-blue-500/60 text-blue-300 hover:bg-blue-600/20 bg-blue-600/10',
    danger:  'border-red-500/40 text-red-400 hover:bg-red-500/15 bg-white/5',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-2.5 py-1.5 rounded text-[10px] font-mono font-semibold
        border transition-all disabled:opacity-25 disabled:cursor-not-allowed
        ${toneClasses[tone]}
      `}
    >
      {children}
    </button>
  );
}

const STATUS_STYLE: Record<string, string> = {
  disconnected: 'bg-white/8 text-white/40 border-white/15',
  connected: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  unauthorized: 'bg-red-500/15 text-red-400 border-red-500/35',
  error: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
};

export function LocalApiPanel({ listener }: { listener: ApiCommandListenerControls }) {
  const { enabled, setEnabled, apiBaseUrl, setApiBaseUrl, apiKey, setApiKey, connectionStatus, pendingCount, lastError, testConnection } = listener;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Connection</Label>
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-[10px] text-white/40 font-mono mb-1">API Base URL</p>
            <input
              type="text"
              value={apiBaseUrl}
              onChange={e => setApiBaseUrl(e.target.value)}
              placeholder="http://localhost:8787"
              className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <p className="text-[10px] text-white/40 font-mono mb-1">API Key</p>
            <input
              type="text"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="dev-local-key"
              className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <SmallButton onClick={testConnection}>Test Connection</SmallButton>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${STATUS_STYLE[connectionStatus]}`}>
              {connectionStatus}
            </span>
          </div>
          {lastError && <p className="text-[10px] font-mono text-red-400/80">{lastError}</p>}
        </div>
      </div>

      <div>
        <Label>Listener</Label>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`w-full py-1.5 rounded text-xs font-mono font-semibold border transition-all ${
            enabled ? 'bg-cyan-600/25 border-cyan-500/45 text-cyan-300' : 'bg-white/5 border-white/12 text-white/45 hover:text-white/70'}`}
        >
          {enabled ? '● Listening for API Commands' : '○ Listen for API Commands'}
        </button>
        {enabled && (
          <p className="mt-1.5 text-[10px] font-mono text-white/30">
            Pending commands: <span className="text-white/60">{pendingCount}</span>
          </p>
        )}
        <p className="mt-1.5 text-[9px] text-white/25 font-mono leading-snug">
          Polls every 1.5s. Keeps listening in Camera Mode / Fullscreen even though this panel isn't visible there.
        </p>
      </div>
    </div>
  );
}
