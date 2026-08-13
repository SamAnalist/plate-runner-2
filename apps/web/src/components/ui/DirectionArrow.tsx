/** Thick down/up arrow glyph for Incoming/Away buttons — matches the app's own depth model (t=0 far/top, t=1 near/bottom): incoming moves down the frame, away moves up. */
export function DirectionArrow({ direction }: { direction: 'down' | 'up' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path
        d={direction === 'down' ? 'M12 3v16M12 19l-6-6M12 19l6-6' : 'M12 21V5M12 5l-6 6M12 5l6 6'}
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
