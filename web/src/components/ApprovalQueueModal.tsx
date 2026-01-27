import { useEffect } from 'react';
import {
  X,
  Package,
  Hash,
  Calendar,
  Building2,
  User,
  Wallet,
  Camera,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ApprovalQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'product' | 'company';
  data?: PendingCompanyDetails | PendingProductDetails;
}

export interface PendingCompanyDetails {
  companyName: string;
  status: string;
  submittedBy: string;
  submittedByName: string;
  submittedByWallet: string;
  updatedAt: string;
}

export interface PendingProductDetails {
  LTONumber: string;
  brandName: string;
  companyId: string;
  lotNumber: string;
  CFPRNumber: string;
  brandNameId: string;
  productName: string;
  expirationDate: string;
  registeredById: string;
  classificationId: string;
  productImageBack: string;
  productImageFront: string;
  dateOfRegistration: string;
  subClassificationId: string;
  productClassification: string;
  productSubClassification: string;
  // Renewal fields
  isRenewal?: boolean;
  previousCertificateHash?: string;
  oldCertificateId?: string;
  renewalRequestDate?: string;
  // Update fields
  isUpdate?: boolean;
  updateRequestDate?: string;
  // Archive fields
  isArchive?: boolean;
  archiveRequestDate?: string;
  // Unarchive fields
  isUnarchive?: boolean;
  unarchiveRequestDate?: string;
}

const ApprovalQueueModal = ({
  isOpen,
  onClose,
  entityType,
  data,
  currentProductData 
}: ApprovalQueueModalProps & { currentProductData?: any }) => {
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

  if (!isOpen || !data) return null;

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 app-bg-primary-soft rounded-lg">
              {entityType === 'company' ? (
                <Building2 className="h-5 w-5 app-text-primary" />
              ) : (
                <Package className="h-5 w-5 app-text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold app-text">
                {entityType === 'company' ? 'Company Details' : 'Product Details'}
              </h2>
              <p className="text-sm app-text-subtle">
                Review information for approval
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:app-bg-neutral rounded-lg transition-colors"
          >
            <X className="h-5 w-5 app-text-subtle" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {entityType === 'company' && 'companyName' in data && (
              <>
                <div>
                  <h3 className="text-lg font-semibold app-text mb-4">
                    Company Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 col-span-1 md:col-span-2">
                      <label className="text-sm font-medium app-text-subtle">
                        Company Name
                      </label>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 app-text-subtle" />
                        <p className="app-text font-medium text-lg">{data.companyName}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium app-text-subtle">
                        Status
                      </label>
                      <div>
                        <Badge variant="secondary">
                          {data.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium app-text-subtle">
                        Updated At
                      </label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 app-text-subtle" />
                        <p className="app-text">{new Date(data.updatedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold app-text mb-4">
                    Submission Details
                  </h3>
                  <div className="app-bg-neutral rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium app-text-subtle">
                          Submitted By
                        </label>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 app-text-primary" />
                          <p className="app-text font-medium">{data.submittedByName}</p>
                        </div>
                        <p className="text-xs app-text-subtle ml-6">({data.submittedBy})</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium app-text-subtle">
                          Wallet Address
                        </label>
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 app-text-subtle" />
                          <code className="text-xs app-text break-all">{data.submittedByWallet}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {entityType === 'product' && 'productName' in data && (
              <>
                {/* Renewal Badge */}
                {data.isRenewal && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-orange-600">
                        RENEWAL
                      </Badge>
                      <p className="text-sm app-text-subtle">
                        This is a renewal request for an expired certificate
                      </p>
                    </div>
                    {data.previousCertificateHash && (
                      <div className="mt-2 space-y-1">
                        <label className="text-xs font-medium app-text-subtle">
                          Previous Certificate Hash:
                        </label>
                        <div className="flex items-center gap-2">
                          <code className="text-xs app-text break-all bg-white px-2 py-1 rounded border">
                            {data.previousCertificateHash}
                          </code>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${data.previousCertificateHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Update Badge */}
                {data.isUpdate && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                       <Badge variant="default" className="bg-blue-600">
                        UPDATE
                      </Badge>
                      <p className="text-sm app-text-subtle">
                        This is a request to update product information
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold app-text mb-4">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium app-text-subtle">
                        LTO Number
                      </label>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 app-text-subtle" />
                        <p className="app-text font-medium">
                          {data.isUpdate && currentProductData && currentProductData.LTONumber !== data.LTONumber ? (
                            <span>
                              <span className="text-red-500 line-through mr-2">{currentProductData.LTONumber}</span>
                              <span className="text-green-600">{data.LTONumber}</span>
                            </span>
                          ) : (
                            data.LTONumber
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium app-text-subtle">
                        CFPR Number
                      </label>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 app-text-subtle" />
                        <p className="app-text font-medium">
                          {data.isUpdate && currentProductData && currentProductData.CFPRNumber !== data.CFPRNumber ? (
                            <span>
                              <span className="text-red-500 line-through mr-2">{currentProductData.CFPRNumber}</span>
                              <span className="text-green-600">{data.CFPRNumber}</span>
                            </span>
                          ) : (
                            data.CFPRNumber
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium app-text-subtle">
                        Lot Number
                      </label>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 app-text-subtle" />
                        <p className="app-text">
                          {data.isUpdate && currentProductData && currentProductData.lotNumber !== data.lotNumber ? (
                            <span>
                              <span className="text-red-500 line-through mr-2">{currentProductData.lotNumber}</span>
                              <span className="text-green-600">{data.lotNumber}</span>
                            </span>
                          ) : (
                            data.lotNumber
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium app-text-subtle">
                        Brand Name
                      </label>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 app-text-subtle" />
                        <p className="app-text">
                          {data.isUpdate && currentProductData && currentProductData.brandName !== data.brandName ? (
                            <span>
                              <span className="text-red-500 line-through mr-2">{currentProductData.brandName}</span>
                              <span className="text-green-600">{data.brandName}</span>
                            </span>
                          ) : (
                            data.brandName
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 col-span-1 md:col-span-2">
                      <label className="text-sm font-medium app-text-subtle">
                        Product Name
                      </label>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 app-text-subtle" />
                        <p className="app-text font-medium">
                          {data.isUpdate && currentProductData && currentProductData.productName !== data.productName ? (
                            <span>
                              <span className="text-red-500 line-through mr-2">{currentProductData.productName}</span>
                              <span className="text-green-600">{data.productName}</span>
                            </span>
                          ) : (
                            data.productName
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold app-text mb-4">
                    Classification
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium app-text-subtle">
                        Product Classification
                      </label>
                      <div>
                        <Badge variant="default">
                          {data.productClassification || "Not specified"}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium app-text-subtle">
                        Product Sub-Classification
                      </label>
                      <div>
                        <Badge variant="secondary">
                          {data.productSubClassification || "Not specified"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold app-text mb-4">
                    Important Dates
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium app-text-subtle">
                        Date of Registration
                      </label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 app-text-subtle" />
                        <p className="app-text">
                          {formatDate(data.dateOfRegistration)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium app-text-subtle">
                        Expiration Date
                      </label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 app-text-subtle" />
                        <p className="app-text">
                          {formatDate(data.expirationDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Images Section */}
                {(data.productImageFront || data.productImageBack) && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold app-text mb-4 flex items-center gap-2">
                      <Camera className="h-5 w-5 app-text-primary" />
                      Product Images
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.productImageFront && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium app-text-subtle">
                            Front Image
                          </label>
                          <div className="relative group">
                            <img
                              src={data.productImageFront}
                              alt="Product Front"
                              className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(data.productImageFront, '_blank')}
                            />
                            <button
                              onClick={() => window.open(data.productImageFront, '_blank')}
                              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              title="View full size"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                      {data.productImageBack && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium app-text-subtle">
                            Back Image
                          </label>
                          <div className="relative group">
                            <img
                              src={data.productImageBack}
                              alt="Product Back"
                              className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(data.productImageBack, '_blank')}
                            />
                            <button
                              onClick={() => window.open(data.productImageBack, '_blank')}
                              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              title="View full size"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end pt-6 border-t mt-6">
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalQueueModal;
