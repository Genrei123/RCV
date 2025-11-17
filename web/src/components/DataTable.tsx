import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { ReactNode } from "react";
import { useState, useMemo } from "react";
import { LoadingSpinner } from "./LoadingSpinner";

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => ReactNode;
}

export interface DataTableProps {
  title: string;
  columns: Column[];
  data: any[];
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  onRowClick?: (row: any) => void;
  loading?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateIcon?: ReactNode;
  showSearch?: boolean;
  /** Optional custom controls rendered to the right of the search bar */
  customControls?: ReactNode;
}

const defaultEmptyIcon = (
  <svg
    className="w-8 h-8 text-gray-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

export function DataTable({
  title,
  columns,
  data,
  searchPlaceholder = "Search...",
  onSearch,
  onRowClick,
  loading = false,
  emptyStateTitle = "No Data Found",
  emptyStateDescription = "You may try to input different keywords, check for typos, or adjust your filters.",
  emptyStateIcon = defaultEmptyIcon,
  showSearch = true,
  customControls,
}: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  // Handle sorting
  const handleSort = (columnKey: string) => {
    setSortConfig((currentSort) => {
      if (currentSort?.key === columnKey) {
        // Toggle direction
        if (currentSort.direction === "asc") {
          return { key: columnKey, direction: "desc" };
        } else {
          return null; // Reset sorting
        }
      }
      // New sort
      return { key: columnKey, direction: "asc" };
    });
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((row) => {
        return columns.some((column) => {
          const value = row[column.key];
          if (value === null || value === undefined) return false;

          // Handle nested objects (like company.name)
          if (typeof value === "object" && value !== null) {
            return Object.values(value).some((nestedValue) =>
              String(nestedValue)
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
            );
          }

          return String(value)
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        });
      });
    }

    // Apply sorting
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === "string" && typeof bValue === "string") {
          const comparison = aValue.localeCompare(bValue);
          return sortConfig.direction === "asc" ? comparison : -comparison;
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchQuery, columns, sortConfig]);

  const renderCellContent = (column: Column, row: any) => {
    const value = row[column.key];

    if (column.render) {
      return column.render(value, row);
    }

    // Auto-render badges for status-like fields
    if (
      column.key.toLowerCase().includes("status") &&
      typeof value === "string"
    ) {
      const variant =
        value.toLowerCase() === "success" || value.toLowerCase() === "active"
          ? "success"
          : value.toLowerCase() === "pending" ||
            value.toLowerCase() === "warning"
          ? "warning"
          : value.toLowerCase() === "failed" || value.toLowerCase() === "error"
          ? "destructive"
          : "default";

      return <Badge variant={variant}>{value}</Badge>;
    }

    return value;
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <CardTitle className="text-xl font-semibold text-gray-800">
            {title}
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            {showSearch && (
              <div className="relative group rounded-md border border-gray-300 focus-within:border-black transition-colors">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-black transition-colors" />
                <Input
                  placeholder={searchPlaceholder}
                  className="pl-10 w-full sm:w-64 border-0 bg-white text-gray-800 placeholder:text-gray-400 focus:text-black focus:placeholder:text-gray-500"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            )}
            {customControls && (
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                {customControls}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : processedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
              {emptyStateIcon}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {emptyStateTitle}
            </h3>
            <p className="text-gray-500 max-w-sm">{emptyStateDescription}</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  {columns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={`text-left font-medium text-gray-600 ${
                        column.sortable
                          ? "cursor-pointer select-none hover:bg-gray-50"
                          : ""
                      }`}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div className="flex items-center gap-2">
                        {column.label}
                        {column.sortable && (
                          <span className="inline-flex">
                            {sortConfig?.key === column.key ? (
                              sortConfig.direction === "asc" ? (
                                <ArrowUp className="h-4 w-4 text-teal-600" />
                              ) : (
                                <ArrowDown className="h-4 w-4 text-teal-600" />
                              )
                            ) : (
                              <ArrowUpDown className="h-4 w-4 text-gray-400" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedData.map((row, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    className={`border-b border-gray-100 hover:bg-teal-50 ${
                      onRowClick ? "cursor-pointer" : ""
                    }`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={
                          column.key === columns[0].key
                            ? "font-medium text-gray-900"
                            : "text-gray-700"
                        }
                      >
                        {renderCellContent(column, row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
