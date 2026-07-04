/**
 * LicensePlate — renders plate text as plain SVG <text>.
 * NEVER rendered as HTML. Text is always validated/normalized upstream.
 * Font size auto-fits to keep text within the plate rectangle.
 */

interface LicensePlateProps {
  /** Already validated & uppercased plate string */
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Optional: show bolt holes for realism */
  showBolts?: boolean;
}

export function LicensePlate({
  text,
  x,
  y,
  width,
  height,
  showBolts = true,
}: LicensePlateProps) {
  const cx = x + width / 2;
  const cy = y + height / 2;

  // Font size: fit by height first, then clamp by width
  const maxByHeight = height * 0.66;
  // Approx char width = 0.62 × fontSize for monospace
  const maxByWidth = (width * 0.88) / Math.max(1, text.length) / 0.62;
  const fontSize = Math.min(maxByHeight, maxByWidth);

  // textLength forces text to always fit horizontally, regardless of glyph count
  const textLength = width * 0.86;

  const boltR   = Math.max(0.6, height * 0.06);
  const boltPad = width * 0.06;

  return (
    <g>
      {/* Plate background */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#f5f5f5"
        rx={height * 0.10}
        ry={height * 0.10}
      />

      {/* Plate border */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke="#aaa"
        strokeWidth={0.5}
        rx={height * 0.10}
        ry={height * 0.10}
      />

      {/* Bolt holes */}
      {showBolts && (
        <>
          <circle cx={x + boltPad}          cy={cy} r={boltR} fill="#ccc" />
          <circle cx={x + width - boltPad}  cy={cy} r={boltR} fill="#ccc" />
        </>
      )}

      {/* Plate text — plain SVG text, never innerHTML */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontFamily='"JetBrains Mono", "Courier New", monospace'
        fontWeight="700"
        fill="#111111"
        textLength={textLength}
        lengthAdjust="spacingAndGlyphs"
        letterSpacing="0.02em"
      >
        {text}
      </text>
    </g>
  );
}
