import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import type { ReactNode } from "react"
import { useState, useMemo } from "react"

export interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => ReactNode;
}

export interface DataTableProps {
  title: string;
  columns: Column[];
  data: any[];
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  onSort?: (sortBy: string) => void;
  sortLabel?: string;
  loading?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateIcon?: ReactNode;
  showSearch?: boolean;
  showSort?: boolean;
}

const defaultEmptyIcon = (
  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export function DataTable({
  title,
  columns,
  data,
  searchPlaceholder = "Search...",
  onSearch,
  onSort,
  sortLabel = "Sort Table: All",
  loading = false,
  emptyStateTitle = "No Data Found",
  emptyStateDescription = "You may try to input different keywords, check for typos, or adjust your filters.",
  emptyStateIcon = defaultEmptyIcon,
  showSearch = true,
  showSort = true
}: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  // Handle column sorting
  const handleSort = (columnKey: string) => {
    if (sortKey === columnKey) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortKey(columnKey);
      setSortDirection('asc');
    }
    
    if (onSort) {
      onSort(columnKey);
    }
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
          if (typeof value === 'object' && value !== null) {
            return Object.values(value).some((nestedValue) =>
              String(nestedValue).toLowerCase().includes(searchQuery.toLowerCase())
            );
          }
          
          return String(value).toLowerCase().includes(searchQuery.toLowerCase());
        });
      });
    }

    // Apply sorting
    if (sortKey) {
      filtered.sort((a, b) => {
        let aValue = a[sortKey];
        let bValue = b[sortKey];

        // Handle nested objects (e.g., company.name)
        if (typeof aValue === 'object' && aValue !== null) {
          aValue = aValue.name || aValue._id || '';
        }
        if (typeof bValue === 'object' && bValue !== null) {
          bValue = bValue.name || bValue._id || '';
        }

        // Handle dates
        if (aValue instanceof Date || bValue instanceof Date) {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }

        // Handle strings
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
        }
        if (typeof bValue === 'string') {
          bValue = bValue.toLowerCase();
        }

        // Compare
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchQuery, sortKey, sortDirection, columns]);

  const renderSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 inline-block text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4 inline-block text-teal-600" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4 inline-block text-teal-600" />
    );
  };

  const renderCellContent = (column: Column, row: any) => {
    const value = row[column.key];
    
    if (column.render) {
      return column.render(value, row);
    }

    // Auto-render badges for status-like fields
    if (column.key.toLowerCase().includes('status') && typeof value === 'string') {
      const variant = 
        value.toLowerCase() === 'success' || value.toLowerCase() === 'active' ? 'success' :
        value.toLowerCase() === 'pending' || value.toLowerCase() === 'warning' ? 'warning' :
        value.toLowerCase() === 'failed' || value.toLowerCase() === 'error' ? 'destructive' :
        'default';
      
      return <Badge variant={variant}>{value}</Badge>;
    }

    return value;
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-xl font-semibold text-gray-800">
            {title}
          </CardTitle>
          <div className="flex items-center gap-4">
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={searchPlaceholder}
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            )}
            {showSort && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSortKey(null);
                  setSortDirection('asc');
                  onSort?.('all');
                }}
              >
                {sortLabel}
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : processedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
              {emptyStateIcon}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{emptyStateTitle}</h3>
            <p className="text-gray-500 max-w-sm">
              {emptyStateDescription}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200">
                {columns.map((column) => (
                  <TableHead 
                    key={column.key} 
                    className="text-left font-medium text-gray-600 cursor-pointer hover:text-teal-600 transition-colors"
                    onClick={() => column.key !== 'actions' && handleSort(column.key)}
                  >
                    <div className="flex items-center">
                      {column.label}
                      {column.key !== 'actions' && renderSortIcon(column.key)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedData.map((row, rowIndex) => (
                <TableRow key={rowIndex} className="border-b border-gray-100 hover:bg-teal-50">
                  {columns.map((column) => (
                    <TableCell 
                      key={column.key} 
                      className={column.key === columns[0].key ? "font-medium text-gray-900" : "text-gray-700"}
                    >
                      {renderCellContent(column, row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}