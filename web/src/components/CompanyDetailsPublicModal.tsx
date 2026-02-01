import { useState, useEffect } from "react";
import { X, Building2, Loader2, ExternalLink, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { toast } from "react-toastify";

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

              {/* Registered Products */}
              {company.products && company.products.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-teal-600" />
                    Registered Products ({company.products.length})
                  </h3>
                  <div className="space-y-3">
                    {company.products.map((product) => (
                      <div key={product._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{product.productName}</h4>
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
                          {product.lotNumber && (
                            <span className="text-xs font-mono text-gray-500 ml-4">
                              Lot: {product.lotNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
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
    </div>
  );
}
