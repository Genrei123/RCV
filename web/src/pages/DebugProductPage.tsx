import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ProductService } from '@/services/productService'
import { AddProductModal } from '@/components/AddProductModal'
import { TestProductCreation } from '@/components/TestProductCreation'

export function DebugProductPage() {
  const [showModal, setShowModal] = useState(false)
  const [apiLogs, setApiLogs] = useState<string[]>([])
  const [testResult, setTestResult] = useState<any>(null)

  const addLog = (message: string) => {
    setApiLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testCompaniesAPI = async () => {
    addLog('🏢 Testing companies API call...')
    try {
      const companies = await ProductService.getCompanies()
      addLog(`✅ Companies fetched: ${JSON.stringify(companies, null, 2)}`)
      setTestResult({ success: true, data: companies })
    } catch (error: any) {
      addLog(`❌ Companies Error: ${error.message}`)
      setTestResult({ success: false, error: error.message, details: error.response?.data })
    }
  }

  const testDirectAPI = async () => {
    addLog('🧪 Testing product creation with real company...')
    try {
      // First get a real company ID
      addLog('📋 Fetching companies first...')
      const companiesResponse = await ProductService.getCompanies()
      addLog(`✅ Companies: ${JSON.stringify(companiesResponse, null, 2)}`)
      
      let companyId = "123e4567-e89b-12d3-a456-426614174000" // fallback
      
      if (companiesResponse && Array.isArray(companiesResponse)) {
        companyId = companiesResponse[0]?._id || companiesResponse[0]?.id || companyId
        addLog(`🏢 Using company ID: ${companyId}`)
      } else if (companiesResponse?.companies && Array.isArray(companiesResponse.companies)) {
        companyId = companiesResponse.companies[0]?._id || companiesResponse.companies[0]?.id || companyId
        addLog(`🏢 Using company ID: ${companyId}`)
      }
      
      const testData = {
        LTONumber: "TEST123456",
        CFPRNumber: "CFPR789012", 
        lotNumber: "LOT001",
        brandName: "Test Brand",
        productName: "Test Product API",
        productClassification: 1, // Should be number: 1 = Raw Product
        productSubClassification: 0, // Should be number: 0 = Gamecock Feeds  
        expirationDate: "2025-12-31",
        dateOfRegistration: "2024-01-01",
        companyId: companyId
      }
      
      addLog(`📤 Sending: ${JSON.stringify(testData, null, 2)}`)
      addLog(`🔍 Data types: productClassification=${typeof testData.productClassification}, productSubClassification=${typeof testData.productSubClassification}`)
      
      const result = await ProductService.createBackendProduct(testData)
      setTestResult({ success: true, data: result })
      addLog(`✅ Success: ${JSON.stringify(result)}`)
    } catch (error: any) {
      setTestResult({ success: false, error: error.message, details: error.response?.data })
      addLog(`❌ Error: ${error.message}`)
      addLog(`📥 Response: ${JSON.stringify(error.response?.data)}`)
      
      // Additional debugging for validation errors
      if (error.response?.data?.message?.includes('Validation failed')) {
        addLog(`🐛 Validation Error Details: ${JSON.stringify(error.response.data, null, 2)}`)
      }
    }
  }

  const handleModalSuccess = (product: any) => {
    addLog(`✅ Product created successfully: ${product.productName}`)
    console.log('Product created:', product)
  }

  const clearLogs = () => {
    setApiLogs([])
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">🔧 Product API Debug Dashboard</h1>
      
      {/* Quick Actions */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4 flex-wrap">
          <Button onClick={() => setShowModal(true)}>
            Open Add Product Modal
          </Button>
          <Button onClick={testDirectAPI} variant="secondary">
            🧪 Test Product Creation
          </Button>
          <Button onClick={testCompaniesAPI} variant="outline">
            🏢 Test Companies API
          </Button>
          <Button onClick={clearLogs} variant="outline">
            Clear Logs
          </Button>
        </div>
        
        {/* Test Result Display */}
        {testResult && (
          <div className="mt-4 p-3 rounded border">
            <h3 className="font-semibold mb-2">🔬 Last Test Result:</h3>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </Card>

      {/* Test Component */}
      <Card className="p-4">
        <TestProductCreation />
      </Card>

      {/* API Logs */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">📋 API Activity Logs</h2>
        <div className="bg-black text-green-400 p-4 rounded max-h-96 overflow-y-auto font-mono text-sm">
          {apiLogs.length === 0 ? (
            <p className="text-gray-400">No API activity yet...</p>
          ) : (
            apiLogs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </Card>

      {/* Debugging Info */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">🐛 Debugging Information</h2>
        <div className="space-y-2 text-sm">
          <p><strong>API Base URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'}</p>
          <p><strong>Products Endpoint:</strong> GET|POST /products</p>
          <p><strong>Companies Endpoint:</strong> GET /companies</p>
          <p><strong>Expected Data Format:</strong></p>
          <pre className="bg-gray-100 p-2 rounded mt-2 overflow-auto">
{JSON.stringify({
  "LTONumber": "string",
  "CFPRNumber": "string", 
  "lotNumber": "string",
  "brandName": "string",
  "productName": "string",
  "productClassification": "number (0-3)",
  "productSubClassification": "number (0-1)",
  "expirationDate": "YYYY-MM-DD",
  "dateOfRegistration": "YYYY-MM-DD",
  "companyId": "string (UUID)"
}, null, 2)}
          </pre>
        </div>
      </Card>

      {/* Add Product Modal */}
      <AddProductModal
        open={showModal}
        onOpenChange={setShowModal}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}