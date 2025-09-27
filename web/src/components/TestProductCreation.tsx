import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ProductService } from '@/services/productService'
import { PRODUCT_TYPES, PRODUCT_SUB_CLASSIFICATIONS, type BackendCreateProductRequest } from '@/types/index'

export function TestProductCreation() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testProductData: BackendCreateProductRequest = {
    LTONumber: 'TEST12345',
    CFPRNumber: 'CFPR67890',
    lotNumber: 'LOT001',
    brandName: 'Test Brand',
    productName: 'Test Product',
    productClassification: PRODUCT_TYPES.Others, // Should be 0
    productSubClassification: PRODUCT_SUB_CLASSIFICATIONS.GamecockFeeds, // Should be 0
    expirationDate: '2024-12-31',
    dateOfRegistration: '2024-01-15',
    companyId: '1' // Using mock company ID
  }

  const handleTest = async () => {
    setLoading(true)
    setResult('')
    
    try {
      console.log('Test data being sent:', JSON.stringify(testProductData, null, 2))
      console.log('productClassification type:', typeof testProductData.productClassification)
      console.log('productSubClassification type:', typeof testProductData.productSubClassification)
      
      const response = await ProductService.createBackendProduct(testProductData)
      setResult(`SUCCESS: ${JSON.stringify(response, null, 2)}`)
    } catch (error: any) {
      console.error('Test failed:', error)
      setResult(`ERROR: ${error.message || JSON.stringify(error, null, 2)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Test Product Creation</h2>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h3 className="font-semibold mb-2">Test Data:</h3>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(testProductData, null, 2)}
        </pre>
      </div>

      <div className="mb-4">
        <Button onClick={handleTest} disabled={loading}>
          {loading ? 'Testing...' : 'Test Product Creation'}
        </Button>
      </div>

      {result && (
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Result:</h3>
          <pre className="text-sm overflow-auto whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}
    </div>
  )
}