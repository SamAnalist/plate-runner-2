import { useEffect, useState } from 'react';
import type { PairingRequestSummary } from '@plate-runner/shared';
import type { DisplayCommandListenerControls } from '../../features/display/useDisplayCommandListener';

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

function useCountdown(expiresAt: string | undefined) {
  const [remainingMs, setRemainingMs] = useState(() => (expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0));
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemainingMs(new Date(expiresAt).getTime() - Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);
  return Math.max(0, remainingMs);
}

function PairingRequestCard({
  request, onApprove, onReject,
}: {
  request: PairingRequestSummary;
  onApprove: () => void;
  onReject: () => void;
}) {
  const remainingMs = useCountdown(request.expiresAt);
  const remainingLabel = remainingMs > 0
    ? `${Math.floor(remainingMs / 60000)}:${String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0')}`
    : 'expired';
  return (
    <div className="px-2.5 py-2 rounded bg-white/5 border border-cyan-500/25">
      <p className="text-[11px] font-mono text-white/80">{request.controllerName}</p>
      <p className="text-[9px] font-mono text-white/30">
        Requested {new Date(request.createdAt).toLocaleTimeString()} · expires in {remainingLabel}
      </p>
      <div className="mt-1.5 flex gap-2">
        <SmallButton tone="primary" onClick={onApprove}>Approve</SmallButton>
        <SmallButton tone="danger" onClick={onReject}>Reject</SmallButton>
      </div>
    </div>
  );
}

export function DisplayModePanel({ listener }: { listener: DisplayCommandListenerControls }) {
  const {
    apiBaseUrl, setApiBaseUrl, apiKey, setApiKey,
    registration, registerDisplay, forgetRegistration, registerError,
    enabled, setEnabled, connectionStatus, pendingCount, lastError, lastCommandAt,
    pairingCode, generatePairingCode, pairingCodeError,
    pairings, refreshPairings, revokePairing,
    pairingRequests, approveRequest, rejectRequest,
  } = listener;

  const [nameInput, setNameInput] = useState('');
  const remainingMs = useCountdown(pairingCode?.expiresAt);
  const remainingLabel = pairingCode
    ? remainingMs > 0
      ? `${Math.floor(remainingMs / 60000)}:${String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, '0')}`
      : 'expired'
    : null;

  useEffect(() => {
    if (registration) refreshPairings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registration?.displayId]);

  if (!registration) {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[10px] text-white/40 font-mono mb-1">API Base URL</p>
          <input
            type="text" value={apiBaseUrl} onChange={e => setApiBaseUrl(e.target.value)}
            placeholder="http://localhost:8787"
            className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <p className="text-[10px] text-white/40 font-mono mb-1">API Key</p>
          <input
            type="text" value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="dev-local-key"
            className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <Label>Register This Display</Label>
          <input
            type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
            placeholder="Entrance Display 1"
            className="w-full mb-2 px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
          />
          <SmallButton tone="primary" onClick={() => nameInput.trim() && registerDisplay(nameInput.trim())} disabled={!nameInput.trim()}>
            Register Display
          </SmallButton>
          {registerError && <p className="mt-1.5 text-[10px] font-mono text-red-400/80">{registerError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>This Display</Label>
        <p className="text-xs font-mono text-white/70">{registration.displayName}</p>
        <p className="text-[9px] font-mono text-white/25 truncate">{registration.displayId}</p>
        <div className="mt-1.5">
          <SmallButton tone="danger" onClick={forgetRegistration}>Forget Registration</SmallButton>
        </div>
      </div>

      <div>
        <Label>Pairing Requests ({pairingRequests.length})</Label>
        {pairingRequests.length === 0 ? (
          <p className="text-[10px] font-mono text-white/25">No pending pairing requests.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {pairingRequests.map(r => (
              <PairingRequestCard
                key={r.pairingRequestId}
                request={r}
                onApprove={() => approveRequest(r.pairingRequestId)}
                onReject={() => rejectRequest(r.pairingRequestId)}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <Label>Pairing Code</Label>
        {pairingCode ? (
          <div className="text-center py-3 rounded bg-white/5 border border-white/12">
            <p className="text-3xl font-mono font-bold tracking-[0.3em] text-cyan-300">{pairingCode.code}</p>
            <p className="mt-1 text-[10px] font-mono text-white/40">
              {remainingLabel === 'expired' ? 'Expired' : `Expires in ${remainingLabel}`}
            </p>
          </div>
        ) : (
          <p className="text-[10px] font-mono text-white/30 py-2">No active code.</p>
        )}
        <div className="mt-2">
          <SmallButton onClick={generatePairingCode}>
            {pairingCode ? 'Regenerate Code' : 'Generate Pairing Code'}
          </SmallButton>
        </div>
        {pairingCodeError && <p className="mt-1.5 text-[10px] font-mono text-red-400/80">{pairingCodeError}</p>}
      </div>

      <div>
        <Label>Listener</Label>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`w-full py-1.5 rounded text-xs font-mono font-semibold border transition-all ${
            enabled ? 'bg-cyan-600/25 border-cyan-500/45 text-cyan-300' : 'bg-white/5 border-white/12 text-white/45 hover:text-white/70'}`}
        >
          {enabled ? '● Listening for Remote Commands' : '○ Listen for Remote Commands'}
        </button>
        <div className="mt-1.5 flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${STATUS_STYLE[connectionStatus]}`}>
            {connectionStatus}
          </span>
          {enabled && <span className="text-[10px] font-mono text-white/30">Pending: <span className="text-white/60">{pendingCount}</span></span>}
        </div>
        {lastCommandAt && (
          <p className="mt-1 text-[9px] font-mono text-white/25">Last command: {new Date(lastCommandAt).toLocaleTimeString()}</p>
        )}
        {lastError && <p className="mt-1 text-[10px] font-mono text-red-400/80">{lastError}</p>}
        <p className="mt-1.5 text-[9px] text-white/25 font-mono leading-snug">
          Polls every 1.5s, heartbeats every 20s. Keeps listening in Camera Mode / Fullscreen even though this panel isn't visible there.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label>Paired Controllers ({pairings.filter(p => !p.revokedAt).length})</Label>
          <button onClick={refreshPairings} className="text-[9px] font-mono text-white/30 hover:text-white/60">↻ refresh</button>
        </div>
        {pairings.length === 0 ? (
          <p className="text-[10px] font-mono text-white/25">No controllers paired yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {pairings.map(p => (
              <div key={p.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-white/5 border border-white/10">
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-white/70 truncate">{p.controllerName ?? p.name ?? 'Unnamed'}</p>
                  <p className="text-[9px] font-mono text-white/25">
                    {p.revokedAt ? 'revoked' : p.lastUsedAt ? `used ${new Date(p.lastUsedAt).toLocaleTimeString()}` : 'never used'}
                  </p>
                </div>
                {!p.revokedAt && (
                  <SmallButton tone="danger" onClick={() => revokePairing(p.id)}>Revoke</SmallButton>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
