import { X, Building2, MapPin, FileText, Package, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Company } from '@/typeorm/entities/company.entity';
import { PDFGenerationService } from '@/services/pdfGenerationService';
import { toast } from 'react-toastify';

interface CompanyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
}

export function CompanyDetailsModal({ isOpen, onClose, company }: CompanyDetailsModalProps) {
  if (!isOpen || !company) return null;

  const handleDownloadCertificate = async () => {
    if (!company) return;
    
    try {
      toast.info('Generating certificate PDF...', { autoClose: 1000 });
      await PDFGenerationService.generateAndDownloadCompanyCertificate(company);
      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Failed to generate certificate. Please try again.');
    }
  };

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
              <Building2 className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Company Details</h2>
              <p className="text-sm text-gray-500">View complete company information</p>
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
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-medium text-gray-500">Company Name</label>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 font-medium text-lg">{company.name}</p>
                  </div>
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-medium text-gray-500">License Number</label>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 font-medium">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono">
                        {company.licenseNumber}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-medium text-gray-500">Registered Address</label>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                    <p className="text-gray-900">{company.address}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Company ID</label>
                  <p className="text-gray-700 text-sm font-mono">{company._id}</p>
                </div>
              </div>
            </div>

            {/* Products Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Registered Products</h3>
              <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {company.products?.length || 0} Product{company.products?.length === 1 ? '' : 's'} Registered
                  </p>
                  {company.products && company.products.length > 0 && (
                    <p className="text-xs text-blue-700 mt-1">
                      This company has registered products in the system
                    </p>
                  )}
                </div>
              </div>

              {/* Products List */}
              {company.products && company.products.length > 0 && (
                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium text-gray-500">Product List</label>
                  <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                    {company.products.map((product, index) => (
                      <div key={product._id || index} className="p-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {product.LTONumber || 'N/A'}
                              </p>
                              {product.CFPRNumber && (
                                <p className="text-xs text-gray-500">
                                  CFPR: {product.CFPRNumber}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Certificate Download Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Certificate</h3>
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-teal-900 mb-1">
                      Company Registration Certificate
                    </p>
                    <p className="text-xs text-teal-700">
                      Download an official certificate with QR code for verification
                    </p>
                  </div>
                  <Button
                    onClick={handleDownloadCertificate}
                    className="bg-teal-600 hover:bg-teal-700 shrink-0"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
