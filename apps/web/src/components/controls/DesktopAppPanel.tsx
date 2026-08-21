import { Button } from '../ui/Button';

/**
 * Links to the GitHub Release PAGE, not a raw asset URL — deliberately,
 * so this works the same whether the repo is public or private. A direct
 * asset-download link 404s for anonymous visitors on a private repo;
 * linking to the release page instead lets GitHub itself prompt for login
 * when needed (browser session auth), then the visitor clicks the actual
 * asset from a page they can already see. Works unconditionally, so
 * moving the repo into a private org later needs no change here.
 *
 * `desktop-latest` is a rolling tag .github/workflows/desktop-build.yml
 * updates in place on every relevant push to main — this always points
 * at the release for the most recently built installer, not a pinned
 * version. See docs/DESKTOP_APP.md.
 */
const REPO = 'SamAnalist/plate-runner-2';
const LATEST_RELEASE_URL = `https://github.com/${REPO}/releases/tag/desktop-latest`;
const RELEASES_URL = `https://github.com/${REPO}/releases`;

export function DesktopAppPanel() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] text-white/35 font-mono leading-snug">
        A native Windows app (built with Tauri) wrapping this same frontend —
        useful for a dedicated Display machine that shouldn't depend on a
        browser tab staying open. Rebuilt automatically from the latest{' '}
        <code className="text-white/50">main</code> whenever relevant code
        changes.
      </p>
      <div className="flex gap-2 flex-wrap">
        <Button tone="primary" onClick={() => window.open(LATEST_RELEASE_URL, '_blank', 'noopener,noreferrer')}>
          ⬇ Download for Windows ↗
        </Button>
        <Button tone="neutral" onClick={() => window.open(RELEASES_URL, '_blank', 'noopener,noreferrer')}>
          All releases ↗
        </Button>
      </div>
      <p className="text-[9px] text-white/25 font-mono leading-snug">
        Opens the release on GitHub — grab <code className="text-white/40">PlateRunner-Setup.exe</code> from
        the Assets list. Unsigned installer — Windows SmartScreen will warn on
        first run ("More info" → "Run anyway"). See docs/DESKTOP_APP.md.
      </p>
    </div>
  );
}
