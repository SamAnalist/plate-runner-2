interface SceneQuickControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  isGateOpening: boolean;
  isDone: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  canSkip: boolean;
  onSkip: () => void;
}

/**
 * Small hover-revealed corner widget over the Local Mode scene — a shortcut for
 * Play/Pause/Skip without reaching for the side panel. Purely presentational;
 * reuses the exact same start/pause/resume conditions as the Playback section.
 */
export function SceneQuickControls({
  isRunning,
  isPaused,
  isGateOpening,
  isDone,
  onStart,
  onPause,
  onResume,
  canSkip,
  onSkip,
}: SceneQuickControlsProps) {
  function handlePlayPause() {
    if (isPaused) onResume();
    else if (isRunning) onPause();
    else onStart();
  }

  const playPauseIcon = isRunning && !isPaused ? '⏸' : '▶';
  const playPauseTitle = isRunning && !isPaused ? 'Pause' : isPaused ? 'Resume' : isDone ? 'Restart' : 'Start';

  return (
    <div className="absolute top-3 right-3 z-10 group">
      <div className="w-8 h-8 rounded-full bg-black/30 border border-white/10 flex items-center justify-center text-white/25 group-hover:opacity-0 transition-opacity pointer-events-none">
        <span className="text-xs">⋯</span>
      </div>
      <div
        className="absolute top-0 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100
          transition-opacity bg-black/50 border border-white/12 rounded-full px-1.5 py-1
          pointer-events-none group-hover:pointer-events-auto"
      >
        <button
          onClick={handlePlayPause}
          disabled={isGateOpening}
          title={playPauseTitle}
          className="w-6 h-6 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="text-[10px]">{playPauseIcon}</span>
        </button>
        {canSkip && (
          <button
            onClick={onSkip}
            title="Skip Current"
            className="w-6 h-6 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="text-[10px]">⏭</span>
          </button>
        )}
      </div>
    </div>
  );
}
