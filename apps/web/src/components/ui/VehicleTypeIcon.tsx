/**
 * Side-profile glyphs for the Sedan/SUV toggle — the text labels alone
 * ("Sedan" vs "SUV") read too similarly at a glance in a small toggle
 * button, so each gets a distinct silhouette: Sedan is low and curvy with
 * a smoothly arched roof; SUV is taller and boxier with a flatter roofline
 * and bigger wheels. Same currentColor/stroke-only convention as
 * DirectionArrow.tsx so both states (selected/unselected) render correctly
 * without any hardcoded fill color. viewBox is cropped tight around the
 * car (no dead space above/below) so a given `size` renders as large and
 * legible as possible.
 */
interface VehicleTypeIconProps {
  /** px, both width and height (icons are wider than tall, so this is the height — width follows the viewBox aspect ratio). Default 22, up from the original 16 — the smaller size read as an ambiguous blob. */
  size?: number;
}

export function SedanIcon({ size = 16 }: VehicleTypeIconProps) {
  return (
    <svg width={size * (24 / 15)} height={size} viewBox="0 5 24 15" fill="none" aria-hidden className="shrink-0">
      <path
        d="M3 16.5l.9-3.3c.3-1.1 1.3-1.9 2.5-1.9h1.1l1.7-2.5c.3-.5.9-.8 1.5-.8h2.6c.6 0 1.2.3 1.5.8l1.7 2.5h1.1c1.2 0 2.2.8 2.5 1.9l.9 3.3"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 16.5h18" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx="7.2" cy="17.6" r="1.6" stroke="currentColor" strokeWidth={1.4} />
      <circle cx="16.8" cy="17.6" r="1.6" stroke="currentColor" strokeWidth={1.4} />
    </svg>
  );
}

export function SuvIcon({ size = 16 }: VehicleTypeIconProps) {
  return (
    <svg width={size * (24 / 15)} height={size} viewBox="0 5 24 15" fill="none" aria-hidden className="shrink-0">
      <path
        d="M3 16.5V12c0-.8.6-1.5 1.4-1.6l1.3-.2 1.2-2.4c.3-.6 1-1 1.7-1h6.8c.7 0 1.4.4 1.7 1l1.2 2.4 1.3.2c.8.1 1.4.8 1.4 1.6v4.5"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 16.5h18" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
      <circle cx="7.2" cy="17.8" r="1.9" stroke="currentColor" strokeWidth={1.4} />
      <circle cx="16.8" cy="17.8" r="1.9" stroke="currentColor" strokeWidth={1.4} />
    </svg>
  );
}
