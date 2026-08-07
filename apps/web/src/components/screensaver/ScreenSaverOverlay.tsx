import type { ScreenSaverStyle } from '../../features/screensaver/useScreenSaver';

const KEYFRAMES = `
@keyframes plate-runner-float {
  0%   { transform: translate(-6px, 0px) rotate(-0.5deg); }
  50%  { transform: translate(6px, -10px) rotate(0.5deg); }
  100% { transform: translate(-6px, 0px) rotate(-0.5deg); }
}
@keyframes plate-runner-drift {
  0%   { transform: translateX(-8vw); }
  50%  { transform: translateX(8vw); }
  100% { transform: translateX(-8vw); }
}
@keyframes plate-runner-gradient {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes plate-runner-pulse-dim {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 0.9; }
}
`;

function FloatingPlate() {
  return (
    <div className="flex flex-col items-center gap-6" style={{ animation: 'plate-runner-drift 14s ease-in-out infinite' }}>
      <div
        className="px-10 py-5 rounded-lg border-2 border-white/25 bg-white/5"
        style={{ animation: 'plate-runner-float 6s ease-in-out infinite' }}
      >
        <p className="text-3xl font-mono font-bold tracking-[0.35em] text-white/70">PLATE RUNNER</p>
      </div>
      <p className="text-xs font-mono text-white/25 uppercase tracking-widest" style={{ animation: 'plate-runner-pulse-dim 3s ease-in-out infinite' }}>
        Waiting for signal…
      </p>
    </div>
  );
}

function MovingLogo() {
  return (
    <div className="flex flex-col items-center gap-6" style={{ animation: 'plate-runner-drift 18s ease-in-out infinite' }}>
      <p
        className="text-2xl font-mono font-bold tracking-[0.2em] text-white/60 uppercase"
        style={{ animation: 'plate-runner-float 7s ease-in-out infinite' }}
      >
        Plate Runner
      </p>
      <p className="text-xs font-mono text-white/25 uppercase tracking-widest" style={{ animation: 'plate-runner-pulse-dim 3s ease-in-out infinite' }}>
        Waiting for signal…
      </p>
    </div>
  );
}

function SubtleGradient() {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-mono text-white/30 uppercase tracking-[0.2em]">Plate Runner</p>
      <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Waiting for signal…</p>
    </div>
  );
}

export function ScreenSaverOverlay({ style }: { style: ScreenSaverStyle }) {
  const isGradient = style === 'subtle_gradient';

  return (
    <div
      data-testid="screensaver-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center select-none cursor-default"
      style={
        isGradient
          ? {
              background: 'linear-gradient(120deg, #050608, #0b0e18, #050608, #0a0d14)',
              backgroundSize: '300% 300%',
              animation: 'plate-runner-gradient 16s ease-in-out infinite',
            }
          : { background: '#050608' }
      }
    >
      <style>{KEYFRAMES}</style>
      {style === 'floating_plate' && <FloatingPlate />}
      {style === 'moving_logo' && <MovingLogo />}
      {style === 'subtle_gradient' && <SubtleGradient />}
    </div>
  );
}
