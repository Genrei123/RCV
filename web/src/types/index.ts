// Types matching the backend ProductValidation schema
export type ProductType = 0 | 1 | 2 | 3 // 0=Others, 1=RawProduct, 2=ProcessedProduct, 3=PackagedProduct

export type ProductSubClassification = 0 | 1 // 0=GamecockFeeds, 1=LayerFeeds

// Product type constants for frontend use
export const PRODUCT_TYPES = {
  Others: 0 as const,
  RawProduct: 1 as const,
  ProcessedProduct: 2 as const,
  PackagedProduct: 3 as const
} as const

export const PRODUCT_SUB_CLASSIFICATIONS = {
  GamecockFeeds: 0 as const,
  LayerFeeds: 1 as const
} as const

// Display labels for the UI
export const PRODUCT_TYPE_LABELS = {
  [PRODUCT_TYPES.Others]: "Others",
  [PRODUCT_TYPES.RawProduct]: "Raw Product",
  [PRODUCT_TYPES.ProcessedProduct]: "Processed Product", 
  [PRODUCT_TYPES.PackagedProduct]: "Packaged Product"
} as const

export const PRODUCT_SUB_CLASSIFICATION_LABELS = {
  [PRODUCT_SUB_CLASSIFICATIONS.GamecockFeeds]: "Gamecock Feeds",
  [PRODUCT_SUB_CLASSIFICATIONS.LayerFeeds]: "Layer Feeds"
} as const

export interface BackendUser {
  _id: string
  email: string
  name: string
}

export interface BackendCompany {
  _id: string
  name: string
  address?: string
  contactEmail?: string
  contactPhone?: string
}

export interface BackendProduct {
  _id: string
  LTONumber: string
  CFPRNumber: string
  lotNumber: string
  brandName: string
  productName: string
  productClassification: ProductType
  productSubClassification: ProductSubClassification
  expirationDate: Date
  dateOfRegistration: Date
  registeredBy: BackendUser
  registeredAt: Date
  company: BackendCompany
}

// Form data for creating a product (matches backend ProductValidation schema)
export interface BackendCreateProductRequest {
  LTONumber: string
  CFPRNumber: string
  lotNumber: string
  brandName: string
  productName: string
  productClassification: ProductType // Now uses numeric enum values
  productSubClassification: ProductSubClassification // Now uses numeric enum values
  expirationDate: string // ISO date string, backend converts to Date
  dateOfRegistration: string // ISO date string, backend converts to Date
  companyId: string // UUID reference to company, backend populates full object
}

// Form validation errors
export interface FormErrors {
  [key: string]: string | undefined
}

// Modal props
export interface AddProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (product: BackendProduct) => void
}