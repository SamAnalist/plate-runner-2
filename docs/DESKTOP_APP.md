# Desktop App (Windows executable via Tauri)

`apps/web`'s existing Vite build can be wrapped as a native desktop app —
most importantly a Windows `.exe`/`.msi` installer — using
[Tauri](https://tauri.app) v2. This required no changes to the frontend
itself: Tauri just loads the same static build in a native window backed
by the OS's own WebView (WebView2 on Windows), and the app's existing
runtime-configured API Base URL/API Key (Settings → API) work exactly the
same as in a browser — there's no separate desktop-specific config.

## Why Tauri (not Electron)

Tauri uses the OS's built-in webview instead of bundling a full Chromium,
so the installer is much smaller (~5–10MB vs. Electron's ~100MB+) and the
app fits the project's kiosk-style Display Mode use case (fullscreen,
Camera Mode) well. The tradeoff: building requires the Rust toolchain
(`rustup`) on whichever machine produces the build — end users installing
the finished `.exe` need nothing extra (WebView2 ships with Windows 10/11
and Tauri's installer bootstraps it if somehow missing).

## Project layout

```txt
apps/web/
  src-tauri/
    Cargo.toml          — Rust package manifest
    tauri.conf.json      — window size/title, build commands, bundle targets, CSP
    src/{main.rs,lib.rs} — Rust entry point (minimal — no custom commands yet)
    icons/                — app icons (currently Tauri's default placeholders —
                             replace with real branding before a real release)
    capabilities/         — Tauri v2's permission system (default-generated,
                             not yet narrowed — see "Known Limitations")
```

`tauri.conf.json`'s key settings:

```json
{
  "identifier": "com.platerunner.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build"
  }
}
```

`beforeDevCommand`/`beforeBuildCommand` mean `tauri dev`/`tauri build`
automatically run Vite for you — no separate terminal needed.

## Local development

Requires Rust (`rustup` — see [rustup.rs](https://rustup.rs)) in addition
to the usual `pnpm install`.

```bash
pnpm install
pnpm desktop:dev     # from repo root — runs `pnpm dev` + opens a native window
# or: pnpm --filter web desktop:dev
```

This opens a real native window loading the live Vite dev server (hot
reload works the same as in a browser tab).

## Building locally

```bash
pnpm desktop:build   # from repo root
# or: pnpm --filter web desktop:build
```

**This builds an installer for whatever OS you run it on** — on macOS
that's a `.app`/`.dmg`, on Linux a `.deb`/`.AppImage`, on Windows an
`.exe`/`.msi`. **To get an actual Windows installer from a non-Windows
machine, you cannot just run this locally** — see the next section.

## Producing a real Windows `.exe`/`.msi`

Tauri's Windows bundling step (NSIS/WiX) is not reliably cross-compilable
from macOS/Linux — the officially supported path is to build **on
Windows itself**, either a real Windows machine or CI. This repo uses
GitHub Actions for that:
[.github/workflows/desktop-build.yml](../.github/workflows/desktop-build.yml),
using [`tauri-apps/tauri-action`](https://github.com/tauri-apps/tauri-action)
(build only) + [`softprops/action-gh-release`](https://github.com/softprops/action-gh-release)
(publish/update the release) on a `windows-latest` runner.

**It runs two ways, producing two different kinds of release:**

1. **Automatically on every push to `main`** that touches
   `apps/web/src/**`, `apps/web/src-tauri/**`, `packages/shared/**`, or a
   few other relevant paths (see the workflow's `paths:` filter — doc-only
   commits don't trigger a rebuild). This updates a **rolling release** at
   the fixed tag `desktop-latest` in place — same tag every time, assets
   replaced. This is what the web app's "Download for Windows" button
   (Settings → Desktop App) links to, via a **fixed filename**
   (`PlateRunner-Setup.exe`) the workflow renames the NSIS output to
   before publishing — so that download link never goes stale even
   though the actual file behind it changes on every build.
2. **Manually** (Actions tab → "Build Windows Desktop App" → "Run
   workflow") also updates `desktop-latest`, same as above — use this to
   force a rebuild without waiting for a qualifying push.
3. **Pushing a tag matching `desktop-v*`** (e.g. `git tag desktop-v0.1.0
   && git push origin desktop-v0.1.0`) instead creates a proper
   **versioned, draft** release at that tag — for an intentional, named
   release with real notes, kept separate from the always-changing
   rolling one.

Every run also uploads the `.exe`/`.msi` as a plain workflow artifact
(`plate-runner-windows-installers`), tag or not — download from the run's
summary page if you just want the file without touching Releases at all.

No repo secrets are required beyond the automatically-provided
`GITHUB_TOKEN` (the workflow's `permissions: contents: write` grants it
release-creation rights for this repo only).

### The web download button

Settings → Desktop App (`apps/web/src/components/controls/DesktopAppPanel.tsx`)
links to the **release page**, not a raw asset URL:

```txt
https://github.com/SamAnalist/plate-runner-2/releases/tag/desktop-latest
```

Deliberate: a direct asset-download URL 404s for anonymous visitors on a
private repo, but a link to the release *page* works either way — GitHub
itself prompts for login when needed (normal browser session auth), and
the visitor then clicks the actual `PlateRunner-Setup.exe` asset from a
page they can already see. **This means the button needs no change if the
repo moves into a private org** (as planned) — anyone with repo access,
logged into github.com in their browser, can click through; anyone
without access sees GitHub's normal "you don't have access" page instead
of a silent 404. The CI workflow still renames the installer to a fixed
filename before publishing (see above) — no longer strictly required for
the button itself, but kept since it's still useful for anyone
downloading via a script instead of the browser.

## Known Limitations

- **Icons are Tauri's default placeholders** (`src-tauri/icons/`) — swap
  them for real branding (`tauri icon <path-to-source-image>` regenerates
  the full icon set) before distributing a real release.
- **Capabilities/permissions are the Tauri-generated default** — Tauri
  v2's permission system (`src-tauri/capabilities/`) hasn't been narrowed
  from the default scaffold. Fine for now since the app makes no custom
  Rust-side (`invoke`) calls yet — revisit if/when a native capability
  (e.g. always-on-top for a dedicated kiosk mode, or a native
  auto-launch-on-boot setting) is added.
- **No code signing** — an unsigned `.exe` will trigger a Windows
  SmartScreen warning on first run. Fine for internal/testing use;
  add a code-signing certificate + signing step to the workflow before
  distributing publicly.
- **The rolling `desktop-latest` release is always "whatever's currently
  on `main`"** — there's no version number attached to it and no changelog
  per build; someone downloading it today vs. next week may get a
  functionally different app with no in-app indication of what changed.
  Fine for an internal/testing distribution channel, not a substitute for
  actual versioned releases (`desktop-v*` tags) if this ever needs real
  release notes for end users.
- **No auto-update** — Tauri supports an updater plugin, not set up here.
  Each new desktop release currently means re-downloading the installer
  manually.

## Related docs

- [DEPLOYMENT.md](../DEPLOYMENT.md) — the web/server deployment (Railway,
  Docker) this desktop app still talks to as its backend; the desktop app
  is a distribution channel for the *frontend*, not a replacement for the
  backend deployment.
