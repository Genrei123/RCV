import { Grid, List, Search, Filter, Plus } from "lucide-react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ProductCard, type Product } from "@/components/ProductCard"
import { DataTable, type Column } from "@/components/DataTable"
import { Pagination } from "@/components/Pagination"
import { PageContainer } from "@/components/PageContainer"

interface ProductsProps {
  products?: Product[];
  loading?: boolean;
  onSearch?: (query: string) => void;
  onSort?: (sortBy: string) => void;
  onAddProduct?: () => void;
  onProductClick?: (product: Product) => void;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export function Products({
  products,
  loading = false,
  onSearch,
  onSort,
  onAddProduct,
  onProductClick,
  currentPage = 1,
  totalPages = 3,
  totalItems = 15,
  itemsPerPage = 12,
  onPageChange,
  viewMode = 'grid',
  onViewModeChange
}: ProductsProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentViewMode, setCurrentViewMode] = useState<'grid' | 'list'>(viewMode)

  // Default sample data
  const defaultProducts: Product[] = [
    {
      id: 'PROD-001',
      name: 'Premium Coffee Beans',
      type: 'Food',
      status: 'active',
      createdDate: '2024-01-15',
      description: 'High-quality arabica coffee beans sourced from sustainable farms',
      price: 24.99,
      category: 'Beverages'
    },
    {
      id: 'PROD-002',
      name: 'Organic Green Tea',
      type: 'Beverage',
      status: 'active',
      createdDate: '2024-01-14',
      description: 'Certified organic green tea leaves with natural antioxidants',
      price: 15.50,
      category: 'Beverages'
    },
    {
      id: 'PROD-003',
      name: 'Vitamin D Supplements',
      type: 'Health',
      status: 'pending',
      createdDate: '2024-01-13',
      description: 'Essential vitamin D3 supplements for daily wellness',
      price: 18.99,
      category: 'Health & Wellness'
    },
    {
      id: 'PROD-004',
      name: 'Wireless Bluetooth Headphones',
      type: 'Electronics',
      status: 'active',
      createdDate: '2024-01-12',
      description: 'High-fidelity wireless headphones with noise cancellation',
      price: 89.99,
      category: 'Electronics'
    },
    {
      id: 'PROD-005',
      name: 'Eco-Friendly Water Bottle',
      type: 'Lifestyle',
      status: 'active',
      createdDate: '2024-01-11',
      description: 'Reusable stainless steel water bottle with insulation',
      price: 29.99,
      category: 'Lifestyle'
    },
    {
      id: 'PROD-006',
      name: 'Smart Fitness Tracker',
      type: 'Electronics',
      status: 'inactive',
      createdDate: '2024-01-10',
      description: 'Advanced fitness tracking with heart rate monitoring',
      price: 149.99,
      category: 'Electronics'
    }
  ];

  // Table columns for list view
  const productColumns: Column[] = [
    { key: 'id', label: 'Product ID' },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'status', label: 'Status' }, // Auto-renders as badges
    { key: 'createdDate', label: 'Created' },
    { 
      key: 'price', 
      label: 'Price',
      render: (value) => value ? `$${value.toFixed(2)}` : '-'
    }
  ];

  const productData = products || defaultProducts;

  // Filter products based on search
  const filteredProducts = productData.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setCurrentViewMode(mode);
    onViewModeChange?.(mode);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageContainer 
      maxWidth="6xl"
      title="Products" 
      description="Manage and view all registered products in the system."
      headerAction={
        <Button onClick={onAddProduct}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      }
    >
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex border rounded-lg">
            <Button
              variant={currentViewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('grid')}
              className="rounded-r-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={currentViewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {currentViewMode === 'grid' ? (
        <>
          {/* Grid View */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={onProductClick}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? "Try adjusting your search query" : "Get started by adding your first product"}
              </p>
              {!searchQuery && (
                <Button onClick={onAddProduct}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* List View */}
          <DataTable
            title=""
            columns={productColumns}
            data={filteredProducts}
            searchPlaceholder="Search products..."
            onSearch={onSearch}
            onSort={onSort}
            loading={loading}
            emptyStateTitle="No Products Found"
            emptyStateDescription="Try adjusting your search or add a new product."
            showSearch={false} // We have our own search above
          />
        </>
      )}

      {/* Pagination */}
      {filteredProducts.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          showingText={`Showing ${Math.min(filteredProducts.length, itemsPerPage)} out of ${totalItems} products`}
        />
      )}
    </PageContainer>
  );
}