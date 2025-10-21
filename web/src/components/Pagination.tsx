interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange?: (page: number) => void;
  showingText?: string;
  showingPosition?: "left" | "right";
}

function range(start: number, end: number) {
  const r = [] as number[];
  for (let i = start; i <= end; i++) r.push(i);
  return r;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showingText,
  showingPosition = "left",
}: PaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // build pages array with ellipses like shadcn: show first, last, neighbors
  const pages: (number | string)[] = [];
  const delta = 1; // show current +/- delta

  if (totalPages <= 7) {
    pages.push(...range(1, totalPages));
  } else {
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    if (left > 2) {
      pages.push(1, "...");
      pages.push(...range(left, right));
    } else {
      pages.push(...range(1, right));
    }

    if (right < totalPages - 1) {
      pages.push("...", totalPages);
    } else if (right === totalPages - 1) {
      pages.push(totalPages);
    }
  }

  const onPrev = () => onPageChange?.(Math.max(1, currentPage - 1));
  const onNext = () => onPageChange?.(Math.min(totalPages, currentPage + 1));

  const showing =
    showingText || `Showing ${startItem}-${endItem} of ${totalItems} results`;

  return (
    <div className="flex items-center justify-between pt-4">
      {showingPosition === "left" && (
        <div className="text-sm text-gray-500">{showing}</div>
      )}

      {totalPages > 1 && (
        <nav
          className="inline-flex items-center space-x-2"
          aria-label="Pagination"
        >
          {showingPosition === "right" && (
            <div className="text-sm text-gray-500 ml-4">{showing}</div>
          )}

          <button
            onClick={onPrev}
            disabled={currentPage === 1}
            className={`inline-flex items-center rounded-md border bg-white px-3 py-1 text-sm font-medium transition-colors hover:bg-gray-50 ${
              currentPage === 1 ? "cursor-not-allowed opacity-50" : ""
            }`}
            aria-label="Previous page"
          >
            Prev
          </button>

          <ul className="inline-flex items-center gap-1">
            {pages.map((p, idx) =>
              typeof p === "number" ? (
                <li key={idx}>
                  <button
                    onClick={() => onPageChange?.(p)}
                    aria-current={p === currentPage ? "page" : undefined}
                    className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md px-3 text-sm font-medium transition-colors ${
                      p === currentPage
                        ? "bg-teal-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                </li>
              ) : (
                <li
                  key={idx}
                  className="inline-flex h-8 min-w-[2rem] items-center justify-center px-2 text-sm text-gray-400"
                >
                  {p}
                </li>
              )
            )}
          </ul>

          <button
            onClick={onNext}
            disabled={currentPage === totalPages}
            className={`inline-flex items-center rounded-md border bg-white px-3 py-1 text-sm font-medium transition-colors hover:bg-gray-50 ${
              currentPage === totalPages ? "cursor-not-allowed opacity-50" : ""
            }`}
            aria-label="Next page"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
