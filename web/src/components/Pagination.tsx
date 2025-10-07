interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange?: (page: number) => void;
  showingText?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showingText
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < totalPages; i++) {
      dots.push(
        <button
          key={i}
          onClick={() => onPageChange?.(i + 1)}
          className={`w-2 h-2 rounded-full transition-colors ${
            i + 1 === currentPage ? 'bg-gray-900' : 'bg-gray-300 hover:bg-gray-500'
          }`}
          aria-label={`Page ${i + 1}`}
        />
      );
    }
    return dots;
  };

  return (
    <div className="flex justify-between items-center text-sm text-gray-500 pt-4">
      <span>
        {showingText || `Showing ${startItem}-${endItem} of ${totalItems} results`}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {renderDots()}
          </div>
        </div>
      )}
    </div>
  );
}