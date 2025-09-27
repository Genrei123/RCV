import { useState, useEffect } from 'react'
import { Products } from '@/pages/Products'
import { AddProductModal } from '@/components/AddProductModal'
import { ProductService } from '@/services/productService'
import type { BackendProduct } from '@/types/index'
import { PRODUCT_TYPE_LABELS, PRODUCT_SUB_CLASSIFICATION_LABELS } from '@/types/index'

// Updated Products page that integrates the AddProductModal
export function ProductsUpdated() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await ProductService.getBackendProducts()
      console.log('Fetched products response:', response)
      
      // Handle different response structures
      const productsData = response.data?.products || response.products || response.data || []
      
      // Convert backend products to frontend display format
      const displayProducts = productsData.map((product: BackendProduct) => ({
        id: product._id,
        name: product.productName,
        type: PRODUCT_TYPE_LABELS[product.productClassification],
        status: 'active', // Default status
        createdDate: new Date(product.dateOfRegistration).toISOString().split('T')[0],
        description: `${product.brandName} - Lot: ${product.lotNumber}`,
        price: 0, // Default price since backend doesn't have price
        category: PRODUCT_SUB_CLASSIFICATION_LABELS[product.productSubClassification]
      }))
      
      setProducts(displayProducts)
    } catch (err: any) {
      console.error('Failed to fetch products:', err)
      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = () => {
    setShowAddModal(true)
  }

  const handleProductCreated = (newProduct: BackendProduct) => {
    console.log('New product created:', newProduct)
    
    // Refresh the products list to get the latest data
    fetchProducts()
    
    // You could also show a success toast here
    alert('Product created successfully!')
  }

  const handleSearch = (query: string) => {
    console.log('Search:', query)
    // Implement search logic
  }

  const handleSort = (sortBy: string) => {
    console.log('Sort by:', sortBy)
    // Implement sort logic
  }

  const handleProductClick = (product: any) => {
    console.log('Product clicked:', product)
    // Navigate to product details or open edit modal
  }

  const handlePageChange = (page: number) => {
    console.log('Page changed:', page)
    // Implement pagination
  }

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    console.log('View mode changed:', mode)
    // Handle view mode change
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p>{error}</p>
          <button 
            onClick={fetchProducts} 
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      )}
      
      <Products
        products={products}
        loading={loading}
        onSearch={handleSearch}
        onSort={handleSort}
        onAddProduct={handleAddProduct}
        onProductClick={handleProductClick}
        currentPage={1}
        totalPages={Math.ceil(products.length / 12)}
        totalItems={products.length}
        itemsPerPage={12}
        onPageChange={handlePageChange}
        viewMode="grid"
        onViewModeChange={handleViewModeChange}
      />

      {/* Add Product Modal */}
      <AddProductModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={handleProductCreated}
      />
    </>
  )
}

// Example of how to use just the modal standalone
export function AddProductModalExample() {
  const [showModal, setShowModal] = useState(false)

  const handleProductCreated = (newProduct: BackendProduct) => {
    console.log('Product created:', newProduct)
    // Handle the newly created product
  }

  return (
    <div className="p-4">
      <button 
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Open Add Product Modal
      </button>

      <AddProductModal
        open={showModal}
        onOpenChange={setShowModal}
        onSuccess={handleProductCreated}
      />
    </div>
  )
}

export default ProductsUpdated