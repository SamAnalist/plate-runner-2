import { useEffect, useState } from 'react';
import type { PairingRequestSummary } from '@plate-runner/shared';
import type { DisplayCommandListenerControls, DisplayConnectionStatus } from '../../features/display/useDisplayCommandListener';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Badge, type BadgeTone } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { FieldError } from '../ui/FieldError';

const CONNECTION_TONE: Record<DisplayConnectionStatus, BadgeTone> = {
  disconnected: 'neutral',
  connected: 'success',
  unauthorized: 'danger',
  error: 'danger',
};

const URL_SCHEME_PATTERN = /^https?:\/\//i;

type SecretStatus = 'active' | 'expired' | 'revoked' | 'unknown';

const SECRET_STATUS_TONE: Record<SecretStatus, BadgeTone> = {
  active: 'success',
  expired: 'warning',
  revoked: 'danger',
  unknown: 'neutral',
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  display_revoked: 'This display has been revoked. Please clear local credentials and re-register.',
  display_secret_expired: 'This display secret has expired. Please clear local credentials and re-register.',
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
    <div className="px-2.5 py-2 rounded-md bg-white/5 border border-cyan-500/25">
      <p className="text-[11px] font-mono text-white/80">{request.controllerName}</p>
      <p className="text-[9px] font-mono text-white/30">
        Requested {new Date(request.createdAt).toLocaleTimeString()} · expires in {remainingLabel}
      </p>
      <div className="mt-1.5 flex gap-2">
        <Button tone="primary" onClick={onApprove}>Approve</Button>
        <Button tone="danger" onClick={onReject}>Reject</Button>
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
    authErrorReason, displaySecurity, rotateSecret, rotateSecretError,
    revokeThisDisplay, revokeError,
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

  const secretStatus: SecretStatus = !displaySecurity
    ? 'unknown'
    : displaySecurity.revokedAt
      ? 'revoked'
      : displaySecurity.secretExpiresAt && new Date(displaySecurity.secretExpiresAt).getTime() <= Date.now()
        ? 'expired'
        : 'active';

  if (!registration) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[10px] font-mono text-white/30 leading-snug">
          Register this machine as a display to receive remote plates,
          queues, and controls from a paired Controller.
        </p>
        <div>
          <Label>API Base URL</Label>
          <input
            type="text" value={apiBaseUrl} onChange={e => setApiBaseUrl(e.target.value)}
            placeholder="http://localhost:8787"
            className={`w-full px-2 py-1.5 rounded bg-white/5 border text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50 ${
              !apiBaseUrl || URL_SCHEME_PATTERN.test(apiBaseUrl) ? 'border-white/15' : 'border-red-500/50'}`}
          />
        </div>
        <div>
          <Label>API Key</Label>
          <input
            type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="dev-local-key"
            className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
          />
          <p className="mt-1 text-[9px] font-mono text-white/25 leading-snug">
            Shared with Settings → Local API — editing it here changes it there too. To remember
            it across reloads, enable "Remember on this device" in Settings.
          </p>
        </div>
        <div>
          <Label>Register This Display</Label>
          <input
            type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
            placeholder="Entrance Display 1" maxLength={80}
            className="w-full mb-2 px-2 py-1.5 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
          />
          <Button tone="primary" onClick={() => nameInput.trim() && registerDisplay(nameInput.trim())} disabled={!nameInput.trim()}>
            Register Display
          </Button>
          {registerError && <div className="mt-1.5"><FieldError>{registerError}</FieldError></div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label>Display Security</Label>
        <p className="text-xs font-mono text-white/70">{registration.displayName}</p>
        <p className="text-[9px] font-mono text-white/25 truncate">{registration.displayId}</p>

        <div className="mt-1.5 flex items-center gap-2">
          <Badge tone={SECRET_STATUS_TONE[secretStatus]}>secret: {secretStatus}</Badge>
        </div>
        <p className="mt-1 text-[9px] font-mono text-white/25">
          Expiration: {displaySecurity?.secretExpiresAt
            ? new Date(displaySecurity.secretExpiresAt).toLocaleString()
            : 'No expiration configured'}
        </p>
        {displaySecurity?.secretLastUsedAt && (
          <p className="text-[9px] font-mono text-white/25">
            Last used: {new Date(displaySecurity.secretLastUsedAt).toLocaleString()}
          </p>
        )}

        {authErrorReason && AUTH_ERROR_MESSAGES[authErrorReason] && (
          <div className="mt-1.5"><FieldError>{AUTH_ERROR_MESSAGES[authErrorReason]}</FieldError></div>
        )}

        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            tone="neutral"
            onClick={() => {
              if (window.confirm('Rotate this display\'s secret? The old secret will stop working immediately.')) {
                rotateSecret();
              }
            }}
          >
            Rotate Secret
          </Button>
          <Button
            tone="danger"
            onClick={() => {
              if (window.confirm(
                `Unregister "${registration.displayName}"? This revokes its secret and all paired controllers. This cannot be undone.`,
              )) {
                revokeThisDisplay();
              }
            }}
          >
            Unregister Display
          </Button>
          <Button tone="danger" variant="ghost" onClick={forgetRegistration}>Forget Registration</Button>
        </div>
        {rotateSecretError && <div className="mt-1.5"><FieldError>{rotateSecretError}</FieldError></div>}
        {revokeError && <div className="mt-1.5"><FieldError>{revokeError}</FieldError></div>}
      </div>

      <div>
        <Label>Pairing Requests ({pairingRequests.length})</Label>
        {pairingRequests.length === 0 ? (
          <EmptyState message="No pending pairing requests." hint="They'll appear here when a Controller enters your pairing code." />
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
          <div className="text-center py-3 rounded-md bg-white/5 border border-white/12">
            <p className="text-3xl font-mono font-bold tracking-[0.3em] text-cyan-300">{pairingCode.code}</p>
            <p className="mt-1 text-[10px] font-mono text-white/40">
              {remainingLabel === 'expired' ? 'Expired' : `Expires in ${remainingLabel}`}
            </p>
          </div>
        ) : (
          <p className="text-[10px] font-mono text-white/30 py-2">No active code.</p>
        )}
        <div className="mt-2">
          <Button tone="primary" onClick={generatePairingCode}>
            {pairingCode ? 'Regenerate Code' : 'Generate Pairing Code'}
          </Button>
        </div>
        {pairingCodeError && <div className="mt-1.5"><FieldError>{pairingCodeError}</FieldError></div>}
      </div>

      <div>
        <Label>Listener</Label>
        <Button
          variant="ghost"
          tone={enabled ? 'primary' : 'neutral'}
          className="w-full"
          onClick={() => setEnabled(!enabled)}
        >
          {enabled ? '● Listening for Remote Commands' : '○ Listen for Remote Commands'}
        </Button>
        <div className="mt-1.5 flex items-center gap-2">
          <Badge tone={CONNECTION_TONE[connectionStatus]}>{connectionStatus}</Badge>
          {enabled && <span className="text-[10px] font-mono text-white/30">Pending: <span className="text-white/60">{pendingCount}</span></span>}
        </div>
        {lastCommandAt && (
          <p className="mt-1 text-[9px] font-mono text-white/25">Last command: {new Date(lastCommandAt).toLocaleTimeString()}</p>
        )}
        {lastError && <div className="mt-1"><FieldError>{lastError}</FieldError></div>}
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
          <EmptyState message="No controllers paired yet." hint="Generate a pairing code above and enter it on a Controller." />
        ) : (
          <div className="flex flex-col gap-1.5">
            {pairings.map(p => (
              <div key={p.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white/5 border border-white/10">
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-white/70 truncate">{p.controllerName ?? p.name ?? 'Unnamed'}</p>
                  <p className="text-[9px] font-mono text-white/25">
                    {p.revokedAt ? 'revoked' : p.lastUsedAt ? `used ${new Date(p.lastUsedAt).toLocaleTimeString()}` : 'never used'}
                  </p>
                </div>
                {!p.revokedAt && (
                  <Button tone="danger" onClick={() => revokePairing(p.id)}>Revoke</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
