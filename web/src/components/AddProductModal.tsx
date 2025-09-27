import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useForm } from '@/hooks/useForm'
import { ProductService } from '@/services/productService'
import type {
  AddProductModalProps,
  BackendCreateProductRequest,
  ProductType,
  ProductSubClassification,
  BackendCompany
} from '@/types/index'
import {
  PRODUCT_TYPES,
  PRODUCT_SUB_CLASSIFICATIONS,
  PRODUCT_TYPE_LABELS,
  PRODUCT_SUB_CLASSIFICATION_LABELS
} from '@/types/index'

// Product type options for dropdown
const PRODUCT_TYPE_OPTIONS = [
  { value: PRODUCT_TYPES.Others, label: PRODUCT_TYPE_LABELS[PRODUCT_TYPES.Others] },
  { value: PRODUCT_TYPES.RawProduct, label: PRODUCT_TYPE_LABELS[PRODUCT_TYPES.RawProduct] },
  { value: PRODUCT_TYPES.ProcessedProduct, label: PRODUCT_TYPE_LABELS[PRODUCT_TYPES.ProcessedProduct] },
  { value: PRODUCT_TYPES.PackagedProduct, label: PRODUCT_TYPE_LABELS[PRODUCT_TYPES.PackagedProduct] }
]

// Product sub-classification options for dropdown
const PRODUCT_SUB_CLASSIFICATION_OPTIONS = [
  { value: PRODUCT_SUB_CLASSIFICATIONS.GamecockFeeds, label: PRODUCT_SUB_CLASSIFICATION_LABELS[PRODUCT_SUB_CLASSIFICATIONS.GamecockFeeds] },
  { value: PRODUCT_SUB_CLASSIFICATIONS.LayerFeeds, label: PRODUCT_SUB_CLASSIFICATION_LABELS[PRODUCT_SUB_CLASSIFICATIONS.LayerFeeds] }
]

const initialFormValues: BackendCreateProductRequest = {
  LTONumber: '',
  CFPRNumber: '',
  lotNumber: '',
  brandName: '',
  productName: '',
  productClassification: PRODUCT_TYPES.Others,
  productSubClassification: PRODUCT_SUB_CLASSIFICATIONS.GamecockFeeds,
  expirationDate: '',
  dateOfRegistration: '',
  companyId: ''
}

// Form validation function
const validateForm = (values: BackendCreateProductRequest) => {
  const errors: Partial<Record<keyof BackendCreateProductRequest, string>> = {}

  // Required field validations
  if (!values.LTONumber.trim()) {
    errors.LTONumber = 'LTO Number is required'
  } else if (values.LTONumber.length < 2 || values.LTONumber.length > 50) {
    errors.LTONumber = 'LTO Number must be between 2 and 50 characters'
  }

  if (!values.CFPRNumber.trim()) {
    errors.CFPRNumber = 'CFPR Number is required'
  } else if (values.CFPRNumber.length < 2 || values.CFPRNumber.length > 50) {
    errors.CFPRNumber = 'CFPR Number must be between 2 and 50 characters'
  }

  if (!values.lotNumber.trim()) {
    errors.lotNumber = 'Lot Number is required'
  } else if (values.lotNumber.length < 2 || values.lotNumber.length > 50) {
    errors.lotNumber = 'Lot Number must be between 2 and 50 characters'
  }

  if (!values.brandName.trim()) {
    errors.brandName = 'Brand Name is required'
  } else if (values.brandName.length < 2 || values.brandName.length > 100) {
    errors.brandName = 'Brand Name must be between 2 and 100 characters'
  }

  if (!values.productName.trim()) {
    errors.productName = 'Product Name is required'
  } else if (values.productName.length < 2 || values.productName.length > 100) {
    errors.productName = 'Product Name must be between 2 and 100 characters'
  }

  if (!values.expirationDate) {
    errors.expirationDate = 'Expiration Date is required'
  } else {
    const expDate = new Date(values.expirationDate)
    if (expDate <= new Date()) {
      errors.expirationDate = 'Expiration Date must be in the future'
    }
  }

  if (!values.dateOfRegistration) {
    errors.dateOfRegistration = 'Date of Registration is required'
  }

  if (!values.companyId) {
    errors.companyId = 'Company is required'
  }

  return errors
}

export function AddProductModal({ open, onOpenChange, onSuccess }: AddProductModalProps) {
  const [companies, setCompanies] = useState<BackendCompany[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)

  const form = useForm({
    initialValues: initialFormValues,
    validate: validateForm
  })

  // Load companies when modal opens
  useEffect(() => {
    if (open) {
      loadCompanies()
      // Set default date of registration to today
      const today = new Date().toISOString().split('T')[0]
      form.handleChange('dateOfRegistration', today)
    }
  }, [open])

  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true)
      // Use ProductService to load companies from the backend
      const response = await ProductService.getCompanies()
      
      // Extract companies from response (handle different response structures)
      const companiesData = response.data?.companies || response.companies || response.data || []
      setCompanies(companiesData)
    } catch (error) {
      console.error('Failed to load companies:', error)
      // Fallback to mock data if API fails
      const mockCompanies: BackendCompany[] = [
        { _id: '1', name: 'Sample Company 1' },
        { _id: '2', name: 'Sample Company 2' },
        { _id: '3', name: 'Sample Company 3' }
      ]
      setCompanies(mockCompanies)
    } finally {
      setLoadingCompanies(false)
    }
  }

  const handleSubmit = async (values: BackendCreateProductRequest) => {
    try {
      // Debug: Log the data being sent
      console.log('Frontend sending data:', JSON.stringify(values, null, 2));
      
      // Use the ProductService to create the product
      const response = await ProductService.createBackendProduct(values)
      
      // Success - extract product from response
      const createdProduct = response.data?.product || response.product || response.data
      onSuccess?.(createdProduct)
      onOpenChange(false)
      form.resetForm()
    } catch (error: any) {
      console.error('Failed to create product:', error)
      
      // Handle validation errors from backend
      if (error?.response?.status === 400) {
        form.setFieldError('LTONumber', 'Invalid product data. Please check all fields.')
      } else if (error?.message) {
        form.setFieldError('LTONumber', error.message)
      } else {
        form.setFieldError('LTONumber', 'Failed to create product. Please try again.')
      }
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    form.resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the product details to register a new product in the system.
          </DialogDescription>
        </DialogHeader>

        <Form onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit(handleSubmit)
        }}>
          <div className="grid gap-4 py-4">
            {/* Row 1: LTO Number & CFPR Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem>
                <FormLabel htmlFor="LTONumber">LTO Number *</FormLabel>
                <FormControl>
                  <Input
                    id="LTONumber"
                    value={form.values.LTONumber}
                    onChange={(e) => form.handleChange('LTONumber', e.target.value)}
                    placeholder="Enter LTO Number"
                  />
                </FormControl>
                {form.errors.LTONumber && (
                  <FormMessage>{form.errors.LTONumber}</FormMessage>
                )}
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="CFPRNumber">CFPR Number *</FormLabel>
                <FormControl>
                  <Input
                    id="CFPRNumber"
                    value={form.values.CFPRNumber}
                    onChange={(e) => form.handleChange('CFPRNumber', e.target.value)}
                    placeholder="Enter CFPR Number"
                  />
                </FormControl>
                {form.errors.CFPRNumber && (
                  <FormMessage>{form.errors.CFPRNumber}</FormMessage>
                )}
              </FormItem>
            </div>

            {/* Row 2: Lot Number & Brand Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem>
                <FormLabel htmlFor="lotNumber">Lot Number *</FormLabel>
                <FormControl>
                  <Input
                    id="lotNumber"
                    value={form.values.lotNumber}
                    onChange={(e) => form.handleChange('lotNumber', e.target.value)}
                    placeholder="Enter Lot Number"
                  />
                </FormControl>
                {form.errors.lotNumber && (
                  <FormMessage>{form.errors.lotNumber}</FormMessage>
                )}
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="brandName">Brand Name *</FormLabel>
                <FormControl>
                  <Input
                    id="brandName"
                    value={form.values.brandName}
                    onChange={(e) => form.handleChange('brandName', e.target.value)}
                    placeholder="Enter Brand Name"
                  />
                </FormControl>
                {form.errors.brandName && (
                  <FormMessage>{form.errors.brandName}</FormMessage>
                )}
              </FormItem>
            </div>

            {/* Row 3: Product Name */}
            <FormItem>
              <FormLabel htmlFor="productName">Product Name *</FormLabel>
              <FormControl>
                <Input
                  id="productName"
                  value={form.values.productName}
                  onChange={(e) => form.handleChange('productName', e.target.value)}
                  placeholder="Enter Product Name"
                />
              </FormControl>
              {form.errors.productName && (
                <FormMessage>{form.errors.productName}</FormMessage>
              )}
            </FormItem>

            {/* Row 4: Product Classification & Sub-Classification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem>
                <FormLabel>Product Classification *</FormLabel>
                <FormControl>
                  <Select
                    value={form.values.productClassification.toString()}
                    onValueChange={(value) => form.handleChange('productClassification', parseInt(value) as ProductType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select classification" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                {form.errors.productClassification && (
                  <FormMessage>{form.errors.productClassification}</FormMessage>
                )}
              </FormItem>

              <FormItem>
                <FormLabel>Product Sub-Classification *</FormLabel>
                <FormControl>
                  <Select
                    value={form.values.productSubClassification.toString()}
                    onValueChange={(value) => form.handleChange('productSubClassification', parseInt(value) as ProductSubClassification)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-classification" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_SUB_CLASSIFICATION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                {form.errors.productSubClassification && (
                  <FormMessage>{form.errors.productSubClassification}</FormMessage>
                )}
              </FormItem>
            </div>

            {/* Row 5: Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormItem>
                <FormLabel htmlFor="dateOfRegistration">Date of Registration *</FormLabel>
                <FormControl>
                  <Input
                    id="dateOfRegistration"
                    type="date"
                    value={form.values.dateOfRegistration}
                    onChange={(e) => form.handleChange('dateOfRegistration', e.target.value)}
                  />
                </FormControl>
                {form.errors.dateOfRegistration && (
                  <FormMessage>{form.errors.dateOfRegistration}</FormMessage>
                )}
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="expirationDate">Expiration Date *</FormLabel>
                <FormControl>
                  <Input
                    id="expirationDate"
                    type="date"
                    value={form.values.expirationDate}
                    onChange={(e) => form.handleChange('expirationDate', e.target.value)}
                  />
                </FormControl>
                {form.errors.expirationDate && (
                  <FormMessage>{form.errors.expirationDate}</FormMessage>
                )}
              </FormItem>
            </div>

            {/* Row 6: Company */}
            <FormItem>
              <FormLabel>Company *</FormLabel>
              <FormControl>
                <Select
                  value={form.values.companyId}
                  onValueChange={(value) => form.handleChange('companyId', value)}
                  disabled={loadingCompanies}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCompanies ? "Loading companies..." : "Select company"} />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company._id} value={company._id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              {form.errors.companyId && (
                <FormMessage>{form.errors.companyId}</FormMessage>
              )}
            </FormItem>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.isSubmitting}>
              {form.isSubmitting ? 'Creating...' : 'Create Product'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}