import { X, Package, Hash, Calendar, Building2, User, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Product } from '@/typeorm/entities/product.entity'

interface ProductDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
}

export function ProductDetailsModal({ isOpen, onClose, product }: ProductDetailsModalProps) {
  if (!isOpen || !product) return null

  const getClassificationName = (classification: number): string => {
    const classMap: { [key: number]: string } = {
      1: 'Class 1',
      2: 'Class 2',
      3: 'Class 3'
    }
    return classMap[classification] || 'Unknown'
  }

  const getSubClassificationName = (subClassification: number): string => {
    const subClassMap: { [key: number]: string } = {
      1: 'Sub-Class 1',
      2: 'Sub-Class 2',
      3: 'Sub-Class 3'
    }
    return subClassMap[subClassification] || 'Unknown'
  }

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getFullName = (user: any): string => {
    if (!user) return 'N/A'
    const parts = [user.firstName, user.middleName, user.lastName].filter(Boolean)
    return parts.join(' ') || 'N/A'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Package className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Product Details</h2>
              <p className="text-sm text-gray-500">View complete product information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">LTO Number</label>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 font-medium">{product.LTONumber}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">CFPR Number</label>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 font-medium">{product.CFPRNumber}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Lot Number</label>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{product.lotNumber}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Brand Name</label>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{product.brandName}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Product Name</label>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 font-medium">{product.productName}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Classification */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Classification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Product Classification</label>
                  <div>
                    <Badge variant="default">{getClassificationName(product.productClassification)}</Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Product Sub-Classification</label>
                  <div>
                    <Badge variant="secondary">{getSubClassificationName(product.productSubClassification)}</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Important Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Date of Registration</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{formatDate(product.dateOfRegistration)}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Expiration Date</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{formatDate(product.expirationDate)}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Registered At</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900">{formatDate(product.registeredAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Information */}
            {product.company && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Company Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Building2 className="h-5 w-5 text-teal-600 mt-0.5" />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-500 block mb-1">Company Name</label>
                      <p className="text-gray-900 font-medium">{product.company.name}</p>
                    </div>
                  </div>

                  {product.company.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Address</label>
                        <p className="text-gray-900">{product.company.address}</p>
                      </div>
                    </div>
                  )}

                  {product.company.licenseNumber && (
                    <div className="flex items-start gap-2">
                      <Hash className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-500 block mb-1">License Number</label>
                        <p className="text-gray-900">{product.company.licenseNumber}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Registered By */}
            {product.registeredBy && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Registered By</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <User className="h-5 w-5 text-teal-600 mt-0.5" />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-500 block mb-1">Full Name</label>
                      <p className="text-gray-900 font-medium">{getFullName(product.registeredBy)}</p>
                    </div>
                  </div>

                  {product.registeredBy.email && (
                    <div className="flex items-start gap-2">
                      <Hash className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Email</label>
                        <p className="text-gray-900">{product.registeredBy.email}</p>
                      </div>
                    </div>
                  )}

                  {product.registeredBy.phoneNumber && (
                    <div className="flex items-start gap-2">
                      <Hash className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Phone Number</label>
                        <p className="text-gray-900">{product.registeredBy.phoneNumber}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-6 border-t mt-6">
            <Button onClick={onClose} className="bg-teal-600 hover:bg-teal-700 text-white">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
