import { useState } from 'react'
import { AddProductModal } from '@/components/AddProductModal'
import { Button } from '@/components/ui/button'
import type { BackendProduct } from '@/types/index'
import { PRODUCT_TYPE_LABELS, PRODUCT_SUB_CLASSIFICATION_LABELS } from '@/types/index'

// Demo component to test the Add Product Modal
export function App() {
  const [showModal, setShowModal] = useState(false)
  const [createdProducts, setCreatedProducts] = useState<BackendProduct[]>([])

  const handleProductCreated = (newProduct: BackendProduct) => {
    console.log('New product created:', newProduct)
    setCreatedProducts(prev => [newProduct, ...prev])
    
    // Show success message
    alert(`Product "${newProduct.productName}" created successfully!`)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">RCV Product Management</h1>
      
      <div className="mb-8">
        <Button onClick={() => setShowModal(true)} size="lg">
          Add New Product
        </Button>
      </div>

      {/* Display created products */}
      {createdProducts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Recently Created Products</h2>
          <div className="grid gap-4">
            {createdProducts.map((product) => (
              <div key={product._id} className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{product.productName}</h3>
                    <p className="text-gray-600">{product.brandName}</p>
                    <p className="text-sm text-gray-500">
                      {PRODUCT_TYPE_LABELS[product.productClassification]} - {PRODUCT_SUB_CLASSIFICATION_LABELS[product.productSubClassification]}
                    </p>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">LTO:</span> {product.LTONumber}</p>
                    <p><span className="font-medium">CFPR:</span> {product.CFPRNumber}</p>
                    <p><span className="font-medium">Lot:</span> {product.lotNumber}</p>
                    <p><span className="font-medium">Expires:</span> {new Date(product.expirationDate).toLocaleDateString()}</p>
                    <p><span className="font-medium">Registered:</span> {new Date(product.dateOfRegistration).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      <AddProductModal
        open={showModal}
        onOpenChange={setShowModal}
        onSuccess={handleProductCreated}
      />
    </div>
  )
}