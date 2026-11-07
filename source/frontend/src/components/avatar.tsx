import Icon from "@/components/icon";

// Stand-in avatar in the spirit of a GitHub identicon: the username alone picks
// the colour and a 5x5 pattern mirrored down the middle column, so the same
// person always gets the same face and no two neighbours look alike.

const GRID = 5;
const UNIQUE_COLUMNS = 3;
const SIZE = 24;
const INSET = 4;
const CELL = (SIZE - INSET * 2) / GRID;

function draws(text: string) {
  let h = 1779033703 ^ text.length;

  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export default function Avatar({
  name,
  className = "h-6 w-auto",
}: {
  name?: string | null;
  className?: string;
}) {
  // Nothing to hash yet - still loading, or a row with nobody on it.
  if (!name) return <Icon src="/profile.svg" className={className} />;

  const next = draws(name.trim().toLowerCase());
  const hue = Math.floor(next() * 360);

  const ink = `hsl(${hue} 45% 45%)`;
  const paper = `hsl(${hue} 40% 90%)`;

  const filled = Array.from(
    { length: GRID * UNIQUE_COLUMNS },
    () => next() < 0.5,
  );

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={className}
      role="img"
      aria-label={name}
    >
      <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill={paper} />
      {Array.from({ length: GRID }, (_, row) =>
        Array.from({ length: GRID }, (_, column) => {
          const mirrored = column < UNIQUE_COLUMNS ? column : GRID - 1 - column;
          if (!filled[row * UNIQUE_COLUMNS + mirrored]) return null;

          return (
            <rect
              key={`${row}-${column}`}
              x={INSET + column * CELL}
              y={INSET + row * CELL}
              width={CELL}
              height={CELL}
              fill={ink}
            />
          );
        }),
      )}
    </svg>
  );
}
