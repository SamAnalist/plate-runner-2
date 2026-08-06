import type { ApiCommandListenerControls, ApiConnectionStatus } from '../../features/api/useApiCommandListener';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Badge, type BadgeTone } from '../ui/Badge';
import { FieldError } from '../ui/FieldError';

const CONNECTION_TONE: Record<ApiConnectionStatus, BadgeTone> = {
  disconnected: 'neutral',
  connected: 'success',
  unauthorized: 'danger',
  error: 'danger',
};

const URL_SCHEME_PATTERN = /^https?:\/\//i;

export function LocalApiPanel({ listener }: { listener: ApiCommandListenerControls }) {
  const { enabled, setEnabled, apiBaseUrl, setApiBaseUrl, apiKey, setApiKey, connectionStatus, pendingCount, lastError, testConnection } = listener;
  const urlLooksValid = !apiBaseUrl || URL_SCHEME_PATTERN.test(apiBaseUrl);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Connection</Label>
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-[10px] text-white/35 uppercase tracking-[0.16em] mb-1">API Base URL</p>
            <input
              type="text"
              value={apiBaseUrl}
              onChange={e => setApiBaseUrl(e.target.value)}
              placeholder="http://localhost:8787"
              className={`w-full px-2 py-1.5 rounded bg-white/5 border text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50 ${
                urlLooksValid ? 'border-white/15' : 'border-red-500/50'}`}
            />
            {!urlLooksValid && (
              <p className="mt-1 text-[9px] font-mono text-red-400/80">Should start with http:// or https://</p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-white/35 uppercase tracking-[0.16em]">API Key</p>
              <button
                onClick={() => setApiKey('')}
                className="text-[9px] font-mono text-white/25 hover:text-white/60 transition-colors"
              >
                Clear API Key
              </button>
            </div>
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="dev-local-key"
              className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
            />
            <p className="mt-1 text-[9px] font-mono text-white/25 leading-snug">
              Only used in this browser session — not saved to local storage. Controller/Display
              credentials are stored locally; clear them from Settings → Local Storage → Remote
              Pairing Credentials.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button tone="primary" onClick={testConnection}>Test Connection</Button>
            <Badge tone={CONNECTION_TONE[connectionStatus]}>{connectionStatus}</Badge>
          </div>
          {lastError && <FieldError>{lastError}</FieldError>}
        </div>
      </div>

      <div>
        <Label>Listener</Label>
        <Button
          variant="ghost"
          tone={enabled ? 'primary' : 'neutral'}
          className="w-full"
          onClick={() => setEnabled(!enabled)}
        >
          {enabled ? '● Listening for API Commands' : '○ Listen for API Commands'}
        </Button>
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
