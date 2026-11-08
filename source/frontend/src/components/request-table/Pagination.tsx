"use client";

type PaginationProps = {
  page: number;
  totalPages: number;
  hasNext: boolean;
  loading: boolean;
  onChange: (page: number) => void;
};

// page numbers show in block of 10, ex: 1-10, 11-20
const BLOCK_SIZE = 10;

export default function Pagination({
  page,
  totalPages,
  hasNext,
  loading,
  onChange,
}: PaginationProps) {
  const base = "min-w-9 h-9 px-3 rounded-full text-sm disabled:text-gray-500";
  const circle =
    "flex items-center justify-center w-9 h-9 rounded-full text-sm";

  const start = Math.floor((page - 1) / BLOCK_SIZE) * BLOCK_SIZE + 1;
  const end = Math.min(start + BLOCK_SIZE - 1, Math.max(totalPages, page));
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="flex flex-row items-center justify-center gap-3 mt-3">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1 || loading}
        className={`${base} font-medium enabled:hover:bg-gray-50 enabled:hover:text-gray-700 enabled:bg-white`}
      >
        Prev
      </button>

      {pages.map((p) =>
        p === page ? (
          <p
            key={p}
            className={`${circle} font-semibold bg-(--primary-color-2) text-white`}
          >
            {p}
          </p>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            disabled={loading}
            className={`${circle} font-medium bg-white text-black enabled:hover:bg-gray-50 disabled:opacity-50`}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={!hasNext || loading}
        className={`${base} font-medium enabled:hover:bg-gray-50 enabled:hover:text-gray-700 enabled:bg-white`}
      >
        Next
      </button>
    </div>
  );
}
