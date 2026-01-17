interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange?: (page: number) => void;
  showingText?: string;
  showingPosition?: "left" | "right";
  alwaysShowControls?: boolean;
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
  alwaysShowControls = false,
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
    <div className="w-full">
      {/* Mobile: stack Page X of Y, Showing, then controls centered */}
      <div className="sm:hidden w-full flex flex-col items-center gap-2 pt-4">
        <div className="text-sm app-text">
          Page {currentPage} of {totalPages}
        </div>
        <div className="text-sm app-text-subtle">{showing}</div>
        {(totalPages > 1 || alwaysShowControls) && (
          <nav
            className="inline-flex items-center space-x-2"
            aria-label="Pagination"
          >
            <button
              onClick={onPrev}
              disabled={currentPage === 1}
              className={`inline-flex items-center rounded-md border bg-white px-3 py-1 text-sm font-medium transition-colors ${
                currentPage === 1 ? "cursor-not-allowed opacity-50" : "hover:bg-gray-200"
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
                          ? "app-bg-primary text-white"
                          : "bg-white app-text-subtle hover:bg-green-100"
                      }`}
                    >
                      {p}
                    </button>
                  </li>
                ) : (
                  <li
                    key={idx}
                    className="inline-flex h-8 min-w-[2rem] items-center justify-center px-2 text-sm app-text-subtle"
                  >
                    {p}
                  </li>
                )
              )}
            </ul>

            <button
              onClick={onNext}
              disabled={currentPage === totalPages}
              className={`inline-flex items-center rounded-md border bg-white px-3 py-1 text-sm font-medium transition-colors hover:app-bg-neutral ${
                currentPage === totalPages
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-gray-200"
              }`}
              aria-label="Next page"
            >
              Next
            </button>
          </nav>
        )}
      </div>

      {/* Desktop / tablet: wrap when constrained */}
      <div className="hidden sm:flex flex-wrap items-center gap-2 pt-4">
        {showingPosition === "left" && (
          <div className="text-sm app-text-subtle flex-shrink-0">{showing}</div>
        )}
        {(totalPages > 1 || alwaysShowControls) && (
          <nav
            className="flex flex-wrap items-center gap-2"
            aria-label="Pagination"
          >
            <button
              onClick={onPrev}
              disabled={currentPage === 1}
              className={`inline-flex items-center rounded-md border bg-white px-3 py-1 text-sm font-medium transition-colors ${
                currentPage === 1 ? "cursor-not-allowed opacity-50" : "hover:bg-gray-200"
              }`}
              aria-label="Previous page"
            >
              Prev
            </button>
            <ul className="flex flex-wrap items-center gap-1">
              {pages.map((p, idx) =>
                typeof p === "number" ? (
                  <li key={idx}>
                    <button
                      onClick={() => onPageChange?.(p)}
                      aria-current={p === currentPage ? "page" : undefined}
                      className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md px-3 text-sm font-medium transition-colors ${
                        p === currentPage
                          ? "app-bg-primary text-white"
                          : "bg-white app-text-subtle hover:bg-green-100"
                      }`}
                    >
                      {p}
                    </button>
                  </li>
                ) : (
                  <li
                    key={idx}
                    className="inline-flex h-8 min-w-[2rem] items-center justify-center px-2 text-sm app-text-subtle"
                  >
                    {p}
                  </li>
                )
              )}
            </ul>

            <button
              onClick={onNext}
              disabled={currentPage === totalPages}
              className={`inline-flex items-center rounded-md border bg-white px-3 py-1 text-sm font-medium transition-colors hover:app-bg-neutral ${
                currentPage === totalPages
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-gray-200"
              }`}
              aria-label="Next page"
            >
              Next
            </button>
            {showingPosition === "right" && (
              <div className="text-sm app-text-subtle mr-2 flex-shrink-0">
                {showing}
              </div>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
