import { Grid, List, Search, Filter, Plus } from "lucide-react"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ProductCard, type Product } from "@/components/ProductCard"
import { DataTable, type Column } from "@/components/DataTable"
import { Pagination } from "@/components/Pagination"
import { PageContainer } from "@/components/PageContainer"
import { AddProductModal } from "@/components/AddProductModal"
import { ProductService } from "@/services/productService"

export function Products() {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentViewMode, setCurrentViewMode] = useState<'grid' | 'list'>('grid')
  const [showAddModal, setShowAddModal] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 12

  // Fetch products from backend
  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 Fetching products from backend...')
      
      const response = await ProductService.getBackendProducts()
      console.log('✅ Products fetched:', response)
      
      if (response && Array.isArray(response.products)) {
        // Transform backend data to frontend format
        const transformedProducts: Product[] = response.products.map((product: any) => ({
          id: product._id || product.id,
          name: product.productName,
          type: getProductTypeLabel(product.productClassification),
          status: 'active', // Default status since backend doesn't have this field
          createdDate: product.dateOfRegistration ? new Date(product.dateOfRegistration).toISOString().split('T')[0] : '',
          description: `${product.brandName} - LTO: ${product.LTONumber}`,
          price: 0, // Backend doesn't have price field
          category: getProductSubClassificationLabel(product.productSubClassification),
          // Additional backend fields for reference
          LTONumber: product.LTONumber,
          CFPRNumber: product.CFPRNumber,
          lotNumber: product.lotNumber,
          brandName: product.brandName,
          expirationDate: product.expirationDate,
          company: product.company
        }))
        
        setProducts(transformedProducts)
        setTotalItems(transformedProducts.length)
        setTotalPages(Math.ceil(transformedProducts.length / itemsPerPage))
      } else {
        setProducts([])
        setTotalItems(0)
        setTotalPages(1)
      }
    } catch (error: any) {
      console.error('❌ Error fetching products:', error)
      setError(error.message || 'Failed to fetch products')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  // Helper functions to transform enum values to labels
  const getProductTypeLabel = (classification: number): string => {
    const types = {
      0: 'Feed',
      1: 'Food', 
      2: 'Veterinary Drug',
      3: 'Veterinary Biologics'
    }
    return types[classification as keyof typeof types] || 'Unknown'
  }

  const getProductSubClassificationLabel = (subClassification: number): string => {
    const subTypes = {
      0: 'Dog',
      1: 'Other Animals'
    }
    return subTypes[subClassification as keyof typeof subTypes] || 'Unknown'
  }

  // Load products on component mount
  useEffect(() => {
    fetchProducts()
  }, [])

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
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setCurrentViewMode(mode);
  };

  const handleAddProduct = () => {
    setShowAddModal(true);
  };

  const handleProductCreated = (newProduct: any) => {
    console.log('New product created:', newProduct);
    // Refresh the products list after successful creation
    fetchProducts();
  };

  const handleProductClick = (product: Product) => {
    console.log('Product clicked:', product);
    // Add navigation or modal logic here
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (sortBy: string) => {
    console.log('Sort by:', sortBy);
    // Add sorting logic here
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

  // Error state
  if (error) {
    return (
      <PageContainer 
        maxWidth="6xl"
        title="Products" 
        description="Manage and view all registered products in the system."
      >
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Products</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={fetchProducts}>
            Try Again
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer 
      maxWidth="6xl"
      title="Products" 
      description="Manage and view all registered products in the system."
      headerAction={
        <Button onClick={handleAddProduct}>
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
                  onClick={handleProductClick}
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
                <Button onClick={handleAddProduct}>
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
            onSearch={handleSearch}
            onSort={handleSort}
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
          onPageChange={handlePageChange}
          showingText={`Showing ${Math.min(filteredProducts.length, itemsPerPage)} out of ${totalItems} products`}
        />
      )}

      {/* Add Product Modal */}
      <AddProductModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={handleProductCreated}
      />
    </PageContainer>
  );
}