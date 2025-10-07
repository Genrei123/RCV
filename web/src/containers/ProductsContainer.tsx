import { useState, useEffect } from "react"
import { Products } from "@/pages/Products"
import type { Product } from "@/components/ProductCard"

export function ProductsContainer() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Simulate API call
  const fetchProducts = async (): Promise<Product[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return [
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
      },
      {
        id: 'PROD-007',
        name: 'Natural Skincare Set',
        type: 'Beauty',
        status: 'active',
        createdDate: '2024-01-09',
        description: 'Complete skincare routine with natural ingredients',
        price: 45.00,
        category: 'Beauty & Personal Care'
      },
      {
        id: 'PROD-008',
        name: 'Yoga Mat Premium',
        type: 'Fitness',
        status: 'active',
        createdDate: '2024-01-08',
        description: 'Non-slip premium yoga mat for all fitness levels',
        price: 35.99,
        category: 'Fitness'
      }
    ]
  }

  // Load products on component mount
  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [])

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    // In real app, you might make an API call here
    console.log('Searching for:', query)
  }

  // Handle sorting
  const handleSort = (sortBy: string) => {
    console.log('Sorting by:', sortBy)
    // In real app, update API call with sort parameter
  }

  // Handle add product
  const handleAddProduct = () => {
    console.log('Add product clicked')
    // In real app, navigate to add product form or open modal
  }

  // Handle product click
  const handleProductClick = (product: Product) => {
    console.log('Product clicked:', product)
    // In real app, navigate to product detail page
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    console.log('Page changed to:', page)
    // In real app, make API call with new page
  }

  // Handle view mode change
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    console.log('View mode changed to:', mode)
  }

  return (
    <Products
      products={products}
      loading={loading}
      onSearch={handleSearch}
      onSort={handleSort}
      onAddProduct={handleAddProduct}
      onProductClick={handleProductClick}
      currentPage={currentPage}
      totalPages={3}
      totalItems={products.length}
      itemsPerPage={12}
      onPageChange={handlePageChange}
      viewMode={viewMode}
      onViewModeChange={handleViewModeChange}
    />
  )
}