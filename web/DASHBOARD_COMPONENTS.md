# Dashboard Components Documentation

This document explains how to use the reusable dashboard components in your RCV application.

## Components Overview

### 1. **StatsCard** - Individual metric card
### 2. **StatsGrid** - Grid layout for multiple stats cards
### 3. **DataTable** - Reusable table with search, sort, and empty states
### 4. **Pagination** - Pagination controls with dots
### 5. **Dashboard** - Main dashboard page component (accepts props)
### 6. **DashboardContainer** - Example container with API integration
### 7. **ProductCard** - Individual product display card
### 8. **Products** - Product management page with grid/list views
### 9. **ProductsContainer** - API integration example for products
### 10. **MapComponent** - Interactive map with location pins
### 11. **Maps** - Maps page with inspector locations

## Usage Examples

### Basic Dashboard with Props

```tsx
import { Dashboard } from "@/pages/Dashboard";
import { Users, UserCheck, MonitorSpeaker } from "lucide-react";

function MyDashboard() {
  const stats = [
    {
      icon: <Users className="h-6 w-6 text-green-500" />,
      label: "TOTAL USERS",
      value: 1234,
      bgColor: "bg-green-50"
    }
  ];

  const auditData = [
    {
      location: "Manila Office",
      action: "Product Verified", 
      date: "2024-01-15",
      type: "Verification",
      status: "Success"
    }
  ];

  return (
    <Dashboard
      stats={stats}
      auditData={auditData}
      loading={false}
      onSearch={(query) => console.log("Search:", query)}
      onSort={(sortBy) => console.log("Sort:", sortBy)}
      currentPage={1}
      totalPages={3}
      totalItems={25}
      itemsPerPage={10}
      onPageChange={(page) => console.log("Page:", page)}
    />
  );
}
```

### DataTable Component (Standalone)

```tsx
import { DataTable } from "@/components/DataTable";

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { 
    key: 'status', 
    label: 'Status',
    render: (value) => <Badge variant={value === 'active' ? 'success' : 'destructive'}>{value}</Badge>
  }
];

const data = [
  { name: 'John Doe', email: 'john@example.com', status: 'active' }
];

<DataTable
  title="Users"
  columns={columns}
  data={data}
  searchPlaceholder="Search users..."
  onSearch={handleSearch}
  loading={false}
  emptyStateTitle="No Users Found"
  emptyStateDescription="Try adjusting your search or filters."
/>
```

### StatsGrid Component

```tsx
import { StatsGrid } from "@/components/StatsGrid";
import { Users } from "lucide-react";

const stats = [
  {
    icon: <Users className="h-6 w-6 text-blue-500" />,
    label: "TOTAL USERS",
    value: 1234,
    bgColor: "bg-blue-50"
  }
];

<StatsGrid stats={stats} columns={3} loading={false} />
```

## Props Documentation

### Dashboard Props

```tsx
interface DashboardProps {
  stats?: StatItem[];           // Array of stat items
  auditData?: AuditRecord[];   // Array of audit records  
  loading?: boolean;           // Show loading states
  onSearch?: (query: string) => void;
  onSort?: (sortBy: string) => void;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
}
```

### DataTable Props

```tsx
interface DataTableProps {
  title: string;                    // Table title
  columns: Column[];               // Column definitions
  data: any[];                     // Table data
  searchPlaceholder?: string;      // Search input placeholder
  onSearch?: (value: string) => void;
  onSort?: (sortBy: string) => void;
  sortLabel?: string;              // Sort button label
  loading?: boolean;               // Loading state
  emptyStateTitle?: string;        // Empty state title
  emptyStateDescription?: string;  // Empty state description
  emptyStateIcon?: ReactNode;      // Custom empty state icon
  showSearch?: boolean;            // Show/hide search
  showSort?: boolean;              // Show/hide sort button
}
```

### Column Definition

```tsx
interface Column {
  key: string;                     // Data key
  label: string;                   // Column header
  render?: (value: any, row: any) => ReactNode; // Custom renderer
}
```

## API Integration Pattern

1. **Create a Container Component**:
```tsx
// containers/DashboardContainer.tsx
export function DashboardContainer() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData().then(setData).finally(() => setLoading(false));
  }, []);

  return <Dashboard data={data} loading={loading} />;
}
```

2. **Use the Container in Your Routes**:
```tsx
import { DashboardContainer } from "@/containers/DashboardContainer";

<Route path="/dashboard" element={<DashboardContainer />} />
```

## Features

### ✅ **Automatic Status Badges**
- Columns with 'status' in the key automatically render as badges
- Success/Active = Green, Pending/Warning = Yellow, Failed/Error = Red

### ✅ **Empty States**
- Customizable "No data found" messages and icons
- Loading states with spinners

### ✅ **Responsive Design**
- Mobile-friendly grid layouts
- Responsive table scrolling

### ✅ **Search & Sort**
- Built-in search functionality
- Sortable columns with callbacks

### ✅ **Pagination**
- Dot-style pagination
- Customizable page counts and labels

## Customization

### Custom Empty State
```tsx
<DataTable
  emptyStateTitle="No Products Found"
  emptyStateDescription="Add your first product to get started."
  emptyStateIcon={<Package className="w-8 h-8" />}
/>
```

### Custom Cell Rendering
```tsx
const columns = [
  {
    key: 'avatar',
    label: 'User',
    render: (value, row) => (
      <div className="flex items-center gap-2">
        <img src={value} className="w-8 h-8 rounded-full" />
        <span>{row.name}</span>
      </div>
    )
  }
];
```

## New Components Added

### Products Page Features
- **Grid/List View Toggle** - Switch between card grid and table list
- **Advanced Search** - Filter products by name, type, or ID
- **Product Cards** - Rich product display with images, prices, status
- **Empty States** - Beautiful "no products found" messaging
- **Loading States** - Skeleton loading for better UX

### Maps Component Features
- **Interactive Location Pins** - Click pins to view inspector details
- **Search Functionality** - Search by inspector name, city, or address
- **Inspector Sidebar** - List view of all inspectors with status
- **Selected Inspector Details** - Detailed view of clicked inspector
- **Status Indicators** - Visual status (active/inactive) on pins and list

### Usage Examples

#### Products with Container Pattern
```tsx
// Using the container for API integration
import { ProductsContainer } from "@/containers/ProductsContainer";

<Route path="/products" element={<ProductsContainer />} />
```

#### Maps Component
```tsx
import { Maps } from "@/pages/Maps";

<Route path="/maps" element={<Maps />} />
```

#### Direct MapComponent Usage
```tsx
import { MapComponent } from "@/components/MapComponent";

<MapComponent
  inspectors={inspectors}
  onInspectorClick={handleInspectorClick}
  onSearch={handleSearch}
  loading={false}
/>
```

## Component Props

### Products Props
```tsx
interface ProductsProps {
  products?: Product[];              // Array of products
  loading?: boolean;                 // Loading state
  onSearch?: (query: string) => void;
  onSort?: (sortBy: string) => void;
  onAddProduct?: () => void;
  onProductClick?: (product: Product) => void;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  viewMode?: 'grid' | 'list';       // View toggle
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}
```

### MapComponent Props
```tsx
interface MapComponentProps {
  inspectors?: Inspector[];          // Array of inspectors
  onInspectorClick?: (inspector: Inspector) => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
  selectedInspector?: Inspector | null;
}
```

This modular approach makes it easy to integrate with your API layer - just pass the data as props!