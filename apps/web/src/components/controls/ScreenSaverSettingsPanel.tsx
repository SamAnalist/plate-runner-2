import { useState } from 'react';
import type { ScreenSaverControls, ScreenSaverStyle } from '../../features/screensaver/useScreenSaver';
import { Button } from '../ui/Button';

const TIMEOUT_PRESETS = [5, 10, 15];

const STYLE_OPTIONS: { value: ScreenSaverStyle; label: string }[] = [
  { value: 'moving_logo', label: 'Moving Logo' },
  { value: 'floating_plate', label: 'Floating Plate' },
  { value: 'subtle_gradient', label: 'Subtle Gradient' },
];

export function ScreenSaverSettingsPanel({ screenSaver }: { screenSaver: ScreenSaverControls }) {
  const { settings, updateSettings } = screenSaver;
  const isPreset = TIMEOUT_PRESETS.includes(settings.timeoutMinutes);
  const [customMinutes, setCustomMinutes] = useState(String(settings.timeoutMinutes));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[9px] font-mono text-white/25 leading-snug">
        Shows a lightweight full-screen animation after a period of
        inactivity — useful when this screen is left open for a camera or
        as a Display for a long time. Any activity, including a remote
        command, dismisses it.
      </p>

      <Button
        variant="ghost"
        tone={settings.enabled ? 'primary' : 'neutral'}
        className="w-full"
        onClick={() => updateSettings({ enabled: !settings.enabled })}
      >
        {settings.enabled ? '● Screen Saver: ON' : '○ Screen Saver: OFF'}
      </Button>

      <div>
        <p className="text-[10px] text-white/35 uppercase tracking-[0.16em] mb-1.5">Timeout</p>
        <div className="flex gap-1 flex-wrap">
          {TIMEOUT_PRESETS.map(minutes => (
            <button
              key={minutes}
              onClick={() => { updateSettings({ timeoutMinutes: minutes }); setCustomMinutes(String(minutes)); }}
              className={`px-2.5 py-1.5 rounded text-xs font-mono font-semibold border transition-all ${
                isPreset && settings.timeoutMinutes === minutes
                  ? 'bg-blue-600/80 border-blue-500/70 text-white'
                  : 'bg-white/5 border-white/12 text-white/50 hover:text-white/80'}`}
            >
              {minutes} min
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] font-mono text-white/40">Custom:</span>
          <input
            type="number"
            min={1}
            max={60}
            value={customMinutes}
            onChange={e => setCustomMinutes(e.target.value)}
            onBlur={() => {
              const n = Number(customMinutes);
              if (Number.isFinite(n) && n > 0) updateSettings({ timeoutMinutes: n });
              else setCustomMinutes(String(settings.timeoutMinutes));
            }}
            className="w-16 px-2 py-1 rounded bg-white/5 border border-white/15 text-[11px] font-mono text-white/80 outline-none focus:border-blue-500/50"
          />
          <span className="text-[9px] font-mono text-white/25">minutes (1–60)</span>
        </div>
      </div>

      <div>
        <p className="text-[10px] text-white/35 uppercase tracking-[0.16em] mb-1.5">Style</p>
        <div className="flex flex-col gap-1">
          {STYLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => updateSettings({ style: opt.value })}
              className={`text-left px-2.5 py-1.5 rounded text-xs font-mono font-semibold border transition-all ${
                settings.style === opt.value
                  ? 'bg-blue-600/80 border-blue-500/70 text-white'
                  : 'bg-white/5 border-white/12 text-white/50 hover:text-white/80'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
