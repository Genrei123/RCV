import { useState, useEffect } from "react";
import { X, Building2, Loader2, ExternalLink, Package, Search, FileText, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { toast } from "react-toastify";
import CertificateTimelineModal from "@/components/CertificateTimelineModal";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface CompanyDetailsPublicModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
}

interface CompanyDetails {
  _id: string;
  name: string;
  address: string;
  licenseNumber: string;
  businessType: string;
  registrationDate?: string;
  sepoliaTransactionId?: string;
  documents?: Array<{
    name: string;
    url: string;
    type: string;
    uploadedAt: string;
  }>;
  products?: Array<{
    _id: string;
    productName: string;
    brandName: string;
    lotNumber: string;
    productClassification: string;
  }>;
}

export default function CompanyDetailsPublicModal({
  isOpen,
  onClose,
  companyId,
  companyName,
}: CompanyDetailsPublicModalProps) {
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [documentErrors, setDocumentErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && companyId) {
      fetchCompanyDetails();
    }
  }, [isOpen, companyId]);

  // Disable background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const html = document.documentElement;
      const body = document.body;
      const previousHtmlOverflow = html.style.overflow;
      const previousBodyOverflow = body.style.overflow;
      const previousBodyPosition = body.style.position;
      const scrollY = window.scrollY;

      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.width = "100%";
      body.style.top = `-${scrollY}px`;

      return () => {
        html.style.overflow = previousHtmlOverflow;
        body.style.overflow = previousBodyOverflow;
        body.style.position = previousBodyPosition;
        body.style.width = "";
        body.style.top = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const fetchCompanyDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/public/company/${companyId}`);
      if (response.data) {
        setCompany(response.data);
      }
    } catch (error: any) {
      console.error("Error fetching company details:", error);
      toast.error("Failed to load company details");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex-1">
            <h2 className="text-xl font-bold app-text flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Company Details
            </h2>
            <p className="text-sm app-text-subtle mt-1">{companyName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : !company ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Company details not found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Company Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Company Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{company.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">License Number</dt>
                    <dd className="mt-1 text-sm font-mono text-gray-900">{company.licenseNumber}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{company.address}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Business Type</dt>
                    <dd className="mt-1 text-sm text-gray-900">{company.businessType || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Registration Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(company.registrationDate)}</dd>
                  </div>
                  {company.sepoliaTransactionId && (
                    <div className="md:col-span-2">
                      <dt className="text-sm font-medium text-gray-500 mb-1">Blockchain Transaction</dt>
                      <dd>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${company.sepoliaTransactionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-mono"
                        >
                          {company.sepoliaTransactionId.slice(0, 10)}...{company.sepoliaTransactionId.slice(-8)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Documents Section */}
              {company.documents && company.documents.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Company Documents ({company.documents.length})
                  </h3>
                  <div className="space-y-2">
                    {company.documents.map((doc, index) => {
                      const hasError = documentErrors[doc.url];
                      
                      const handleDocumentClick = async (e: React.MouseEvent) => {
                        e.preventDefault();
                        
                        // Try to fetch the document to check if it exists
                        try {
                          const response = await fetch(doc.url, { method: 'HEAD' });
                          if (response.ok) {
                            window.open(doc.url, '_blank', 'noopener,noreferrer');
                          } else {
                            setDocumentErrors(prev => ({ ...prev, [doc.url]: true }));
                            toast.error('Document not found. It may have been moved or deleted.');
                          }
                        } catch {
                          // If HEAD request fails (CORS), try opening directly
                          window.open(doc.url, '_blank', 'noopener,noreferrer');
                        }
                      };

                      return (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                            hasError 
                              ? 'bg-red-50 border border-red-200' 
                              : 'bg-white border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded flex items-center justify-center ${
                              hasError ? 'bg-red-100' : 'bg-blue-100'
                            }`}>
                              {hasError ? (
                                <AlertCircle className="h-5 w-5 text-red-600" />
                              ) : (
                                <FileText className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${hasError ? 'text-red-900' : 'text-gray-900'}`}>
                                {doc.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {doc.type} • Uploaded {formatDate(doc.uploadedAt)}
                              </p>
                              {hasError && (
                                <p className="text-xs text-red-600 mt-1">
                                  Document unavailable
                                </p>
                              )}
                            </div>
                          </div>
                          {!hasError && (
                            <button
                              onClick={handleDocumentClick}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              <Download className="h-4 w-4" />
                              View
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Registered Products */}
              {company.products && company.products.length > 0 && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="h-5 w-5 text-teal-600" />
                      Registered Products ({company.products.length})
                    </h3>
                    {/* Product Search */}
                    <div className="relative w-full sm:w-auto sm:min-w-[250px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search products..."
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        className="pl-10 h-9 text-sm"
                      />
                    </div>
                  </div>
                  {/* Search Results Count */}
                  {productSearchQuery && (
                    <p className="text-sm text-gray-500 mb-3">
                      Found {company.products.filter((product) => {
                        const query = productSearchQuery.toLowerCase();
                        return (
                          product.productName.toLowerCase().includes(query) ||
                          product.brandName.toLowerCase().includes(query) ||
                          product.lotNumber?.toLowerCase().includes(query) ||
                          product.productClassification?.toLowerCase().includes(query)
                        );
                      }).length} product{company.products.filter((product) => {
                        const query = productSearchQuery.toLowerCase();
                        return (
                          product.productName.toLowerCase().includes(query) ||
                          product.brandName.toLowerCase().includes(query) ||
                          product.lotNumber?.toLowerCase().includes(query) ||
                          product.productClassification?.toLowerCase().includes(query)
                        );
                      }).length !== 1 ? 's' : ''}
                    </p>
                  )}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {company.products
                      .filter((product) => {
                        if (!productSearchQuery) return true;
                        const query = productSearchQuery.toLowerCase();
                        return (
                          product.productName.toLowerCase().includes(query) ||
                          product.brandName.toLowerCase().includes(query) ||
                          product.lotNumber?.toLowerCase().includes(query) ||
                          product.productClassification?.toLowerCase().includes(query)
                        );
                      })
                      .map((product) => (
                      <div 
                        key={product._id} 
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:border-teal-300 hover:bg-teal-50/30 transition-all cursor-pointer group"
                        onClick={() => {
                          setSelectedProduct({ id: product._id, name: product.productName });
                          setIsProductModalOpen(true);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 group-hover:text-teal-700 transition-colors">{product.productName}</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                                {product.brandName}
                              </Badge>
                              {product.productClassification && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {product.productClassification}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {product.lotNumber && (
                              <span className="text-xs font-mono text-gray-500">
                                Lot: {product.lotNumber}
                              </span>
                            )}
                            <span className="text-xs text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              Click to view details →
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {company.products.filter((product) => {
                      if (!productSearchQuery) return true;
                      const query = productSearchQuery.toLowerCase();
                      return (
                        product.productName.toLowerCase().includes(query) ||
                        product.brandName.toLowerCase().includes(query) ||
                        product.lotNumber?.toLowerCase().includes(query) ||
                        product.productClassification?.toLowerCase().includes(query)
                      );
                    }).length === 0 && (
                      <div className="text-center py-8">
                        <Search className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500">No products match your search</p>
                        <p className="text-sm text-gray-400 mt-1">Try different keywords</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Product Details Modal */}
      {selectedProduct && (
        <CertificateTimelineModal
          isOpen={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setSelectedProduct(null);
          }}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          isPublic={true}
        />
      )}
    </div>
  );
}
