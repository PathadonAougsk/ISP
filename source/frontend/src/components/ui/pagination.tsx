"use client";

// page numbers show in block of 10, ex: 1-10, 11-20
const BLOCK_SIZE = 10;

const STEP =
  "h-9 min-w-9 rounded-full px-3 text-sm font-medium disabled:text-gray-500 " +
  "enabled:bg-white enabled:hover:bg-gray-100 enabled:hover:text-gray-700";
const CIRCLE = "flex h-9 w-9 items-center justify-center rounded-full text-sm";

export default function Pagination({
  page,
  totalPages,
  hasNext,
  loading,
  onChange,
}: {
  page: number;
  totalPages: number;
  hasNext: boolean;
  loading: boolean;
  onChange: (page: number) => void;
}) {
  const start = Math.floor((page - 1) / BLOCK_SIZE) * BLOCK_SIZE + 1;
  const end = Math.min(start + BLOCK_SIZE - 1, Math.max(totalPages, page));
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="pointer-events-auto flex w-fit flex-row items-center justify-center gap-3 rounded-full bg-white px-3 py-2 shadow-lg ring-1 ring-inset ring-gray-200">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1 || loading}
        className={STEP}
      >
        Prev
      </button>

      {pages.map((p) =>
        p === page ? (
          <p
            key={p}
            className={`${CIRCLE} bg-(--primary-color-2) font-semibold text-white`}
          >
            {p}
          </p>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            disabled={loading}
            className={`${CIRCLE} bg-white font-medium text-black enabled:hover:bg-gray-100 disabled:opacity-50`}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={!hasNext || loading}
        className={STEP}
      >
        Next
      </button>
    </div>
  );
}
