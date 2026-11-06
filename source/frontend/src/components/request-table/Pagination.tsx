"use client";

type PaginationProps = {
  page: number;
  hasNext: boolean;
  loading: boolean;
  onChange: (page: number) => void;
};

export default function Pagination({
  page,
  hasNext,
  loading,
  onChange,
}: PaginationProps) {
  const base = "min-w-9 h-9 px-3 rounded-full text-sm disabled:text-gray-500";

  return (
    <div className="flex flex-row items-center justify-center gap-3 mt-3">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1 || loading}
        className={`${base} font-medium enabled:hover:bg-gray-50 enabled:hover:text-gray-700 enabled:bg-white`}
      >
        Prev
      </button>

      <p
        className={`${base} flex items-center justify-center font-semibold bg-(--primary-color-2) text-white opacity-100!`}
      >
        {page}
      </p>

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
