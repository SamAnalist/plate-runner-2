import { Button } from '../ui/Button';

/**
 * Repo is public (confirmed 2026-08-21) — direct GitHub Release asset
 * links work for anonymous visitors, no download proxy needed. If the
 * repo is ever made private, this link breaks (GitHub requires auth to
 * download release assets from a private repo) — swap for a backend
 * proxy endpoint at that point, see docs/DESKTOP_APP.md.
 */
const REPO = 'SamAnalist/plate-runner-2';

/**
 * Fixed filename, deliberately NOT versioned (no "_0.1.0_x64" in the
 * name) — .github/workflows/desktop-build.yml renames the NSIS output to
 * this exact name before publishing, so this URL never goes stale across
 * rebuilds. The `desktop-latest` tag is a rolling release the workflow
 * updates in place on every relevant push to main — this always points
 * at the most recently built installer, not a specific version.
 */
const DOWNLOAD_URL = `https://github.com/${REPO}/releases/download/desktop-latest/PlateRunner-Setup.exe`;
const RELEASES_URL = `https://github.com/${REPO}/releases`;

export function DesktopAppPanel() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] text-white/35 font-mono leading-snug">
        A native Windows app (built with Tauri) wrapping this same frontend —
        useful for a dedicated Display machine that shouldn't depend on a
        browser tab staying open. Rebuilt automatically from the latest{' '}
        <code className="text-white/50">main</code> whenever relevant code
        changes; the link below always points at that latest build, not a
        pinned version.
      </p>
      <div className="flex gap-2 flex-wrap">
        <Button tone="primary" onClick={() => window.open(DOWNLOAD_URL, '_blank', 'noopener,noreferrer')}>
          ⬇ Download for Windows
        </Button>
        <Button tone="neutral" onClick={() => window.open(RELEASES_URL, '_blank', 'noopener,noreferrer')}>
          All releases ↗
        </Button>
      </div>
      <p className="text-[9px] text-white/25 font-mono leading-snug">
        Unsigned installer — Windows SmartScreen will warn on first run
        ("More info" → "Run anyway"). See docs/DESKTOP_APP.md for details.
      </p>
    </div>
  );
}
