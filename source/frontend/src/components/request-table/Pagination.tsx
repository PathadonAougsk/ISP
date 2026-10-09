"use client";

export default function Pagination({
  page,
  hasNext,
  loading,
  onChange,
}: {
  page: number;
  hasNext: boolean;
  loading: boolean;
  onChange: (page: number) => void;
}) {
  const last = page + (hasNext ? 1 : 0);
  const first = Math.max(1, last - 6);
  const numbers = Array.from({ length: last - first + 1 }, (_, i) => first + i);

  const base = "min-w-9 h-9 px-3 rounded-full text-sm disabled:opacity-40";

  return (
    <div className="flex items-center justify-center gap-1 mt-3">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1 || loading}
        className={`${base} hover:bg-gray-100`}
      >
        Prev
      </button>

      {numbers.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          disabled={loading || n === page}
          className={
            n === page
              ? `${base} bg-(--primary-color-2) text-white opacity-100!`
              : `${base} hover:bg-gray-100`
          }
        >
          {n}
        </button>
      ))}

      <button
        onClick={() => onChange(page + 1)}
        disabled={!hasNext || loading}
        className={`${base} hover:bg-gray-100`}
      >
        Next
      </button>
    </div>
  );
}
