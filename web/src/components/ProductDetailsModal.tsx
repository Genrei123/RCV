import { useState, useEffect } from 'react';
import {
  X,
  Package,
  Hash,
  Calendar,
  Building2,
  User,
  MapPin,
  Download,
  Camera,
  ExternalLink,
  Shield,
  Wallet,
  Link2,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/typeorm/entities/product.entity";
import { PDFGenerationService } from "@/services/pdfGenerationService";
import { toast } from "react-toastify";
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface ApproverRecord {
  approverId: string;
  approverName: string;
  approverWallet: string;
  approvalDate: string;
  signature: string;
}

interface ApprovalData {
  _id: string;
  certificateId: string;
  status: 'pending' | 'approved' | 'rejected';
  approvers: ApproverRecord[];
  blockchainTxHash?: string;
  blockchainTimestamp?: string;
  blockchainBlockNumber?: number;
  submitterName?: string;
  createdAt: string;
}

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function ProductDetailsModal({
  isOpen,
  onClose,
  product,
}: ProductDetailsModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [approvalData, setApprovalData] = useState<ApprovalData | null>(null);
  const [loadingApproval, setLoadingApproval] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);

  // Check if product is expired
  const isExpired = product?.expirationDate 
    ? new Date(product.expirationDate) < new Date() 
    : false;
  
  // Check days until expiration (negative if expired)
  const daysUntilExpiration = product?.expirationDate 
    ? Math.ceil((new Date(product.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Fetch approval info when modal opens
  useEffect(() => {
    const fetchApprovalInfo = async () => {
      if (!isOpen || !product?._id) return;
      
      setLoadingApproval(true);
      try {
        const response = await axios.get(
          `${API_URL}/certificate-approval/entity/product/${product._id}`,
          { withCredentials: true }
        );
        if (response.data.success && response.data.data) {
          setApprovalData(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching approval info:', error);
      } finally {
        setLoadingApproval(false);
      }
    };

    fetchApprovalInfo();
  }, [isOpen, product?._id]);

  // Handle renewal submission
  const handleRenewal = async () => {
    if (!product || !isExpired || isRenewing) return;
    
    setIsRenewing(true);
    try {
      // Submit renewal request through the certificate approval system
      const response = await axios.post(
        `${API_URL}/certificate-approval/renewal`,
        {
          entityType: 'product',
          entityId: product._id,
          entityName: product.productName,
        },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        toast.success('Renewal request submitted successfully! It will be reviewed by administrators.');
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to submit renewal request');
      }
    } catch (error: any) {
      console.error('Error submitting renewal:', error);
      toast.error(error.response?.data?.message || 'Failed to submit renewal request');
    } finally {
      setIsRenewing(false);
    }
  };

  if (!isOpen || !product) return null;

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getFullName = (user: any): string => {
    if (!user) return "N/A";
    const parts = [user.firstName, user.middleName, user.lastName].filter(
      Boolean
    );
    return parts.join(" ") || "N/A";
  };

  const handleDownloadCertificate = async () => {
    if (!product || isDownloading) return;
    
    setIsDownloading(true);
    try {
      toast.info("Generating certificate PDF...", { autoClose: 1000 });
      await PDFGenerationService.generateAndDownloadProductCertificate(product);
      toast.success("Certificate downloaded successfully!");
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast.error("Failed to generate certificate. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 app-bg-primary-soft rounded-lg">
              <Package className="h-5 w-5 app-text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold app-text">Product Details</h2>
              <p className="text-sm app-text-subtle">
                View complete product information
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
                    <p className="app-text font-medium">{product.LTONumber}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    CFPR Number
                  </label>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 app-text-subtle" />
                    <p className="app-text font-medium">{product.CFPRNumber}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Lot Number
                  </label>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 app-text-subtle" />
                    <p className="app-text">{product.lotNumber}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Brand Name
                  </label>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 app-text-subtle" />
                    <p className="app-text">{product.brandName}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Product Name
                  </label>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 app-text-subtle" />
                    <p className="app-text font-medium">
                      {product.productName}
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
                      {product.productClassification || "Not specified"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Product Sub-Classification
                  </label>
                  <div>
                    <Badge variant="secondary">
                      {product.productSubClassification || "Not specified"}
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
                      {formatDate(product.dateOfRegistration)}
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
                      {formatDate(product.expirationDate)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Registered At
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 app-text-subtle" />
                    <p className="app-text">
                      {formatDate(product.registeredAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Images Section */}
            {(product.productImageFront || product.productImageBack) && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold app-text mb-4 flex items-center gap-2">
                  <Camera className="h-5 w-5 app-text-primary" />
                  Product Images
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.productImageFront && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium app-text-subtle">
                        Front Image
                      </label>
                      <div className="relative group">
                        <img
                          src={product.productImageFront}
                          alt="Product Front"
                          className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(product.productImageFront, '_blank')}
                        />
                        <button
                          onClick={() => window.open(product.productImageFront, '_blank')}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="View full size"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  {product.productImageBack && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium app-text-subtle">
                        Back Image
                      </label>
                      <div className="relative group">
                        <img
                          src={product.productImageBack}
                          alt="Product Back"
                          className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(product.productImageBack, '_blank')}
                        />
                        <button
                          onClick={() => window.open(product.productImageBack, '_blank')}
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

            {product.company && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold app-text mb-4">
                  Company Information
                </h3>
                <div className="app-bg-neutral rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 app-text-primary mt-0.5" />
                        <div>
                          <label className="text-sm font-medium app-text-subtle block mb-1">
                            Company Name
                          </label>
                          <p className="app-text font-medium">
                            {product.company.name}
                          </p>
                        </div>
                      </div>
                    </div>
                    {product.company.address && (
                      <div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 app-text-subtle mt-0.5" />
                          <div>
                            <label className="text-sm font-medium app-text-subtle block mb-1">
                              Address
                            </label>
                            <p className="app-text">
                              {product.company.address}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {product.company.licenseNumber && (
                      <div>
                        <div className="flex items-center gap-2">
                          <Hash className="h-5 w-5 app-text-subtle mt-0.5" />
                          <div>
                            <label className="text-sm font-medium app-text-subtle block mb-1">
                              License Number
                            </label>
                            <p className="app-text">
                              {product.company.licenseNumber}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {product.registeredBy && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold app-text mb-4">
                  Registered By
                </h3>
                <div className="app-bg-neutral rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 app-text-primary mt-0.5" />
                        <div>
                          <label className="text-sm font-medium app-text-subtle block mb-1">
                            Full Name
                          </label>
                          <p className="app-text font-medium">
                            {getFullName(product.registeredBy)}
                          </p>
                        </div>
                      </div>
                    </div>
                    {product.registeredBy.email && (
                      <div>
                        <div className="flex items-center gap-2">
                          <Hash className="h-5 w-5 app-text-subtle mt-0.5" />
                          <div>
                            <label className="text-sm font-medium app-text-subtle block mb-1">
                              Email
                            </label>
                            <p className="app-text">
                              {product.registeredBy.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {product.registeredBy.phoneNumber && (
                      <div>
                        <div className="flex items-center gap-2">
                          <Hash className="h-5 w-5 app-text-subtle mt-0.5" />
                          <div>
                            <label className="text-sm font-medium app-text-subtle block mb-1">
                              Phone Number
                            </label>
                            <p className="app-text">
                              {product.registeredBy.phoneNumber}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Blockchain Verification & Approval Info */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold app-text mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 app-text-primary" />
                Blockchain Verification & Approvals
              </h3>
              
              {/* Transaction Info */}
              {product.sepoliaTransactionId ? (
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      ✓ Verified on Sepolia Blockchain
                    </span>
                    <Badge variant="default" className="bg-green-600">On-Chain</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                    <Link2 className="h-3 w-3" />
                    <code className="flex-1 truncate">{product.sepoliaTransactionId}</code>
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${product.sepoliaTransactionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded"
                      title="View on Etherscan"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">
                    ⚠ Not yet registered on blockchain
                  </span>
                </div>
              )}

              {/* Approval Info */}
              {loadingApproval ? (
                <div className="flex items-center gap-2 text-sm app-text-subtle">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading approval details...
                </div>
              ) : approvalData ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium app-text">Approval Status:</span>
                    <Badge 
                      variant={approvalData.status === 'approved' ? 'default' : 
                               approvalData.status === 'rejected' ? 'destructive' : 'secondary'}
                      className={approvalData.status === 'approved' ? 'bg-green-600' : ''}
                    >
                      {approvalData.status.charAt(0).toUpperCase() + approvalData.status.slice(1)}
                    </Badge>
                  </div>

                  {approvalData.submitterName && (
                    <div className="text-sm">
                      <span className="app-text-subtle">Submitted by:</span>{' '}
                      <span className="app-text font-medium">{approvalData.submitterName}</span>
                    </div>
                  )}

                  {/* Admin Approvers */}
                  {approvalData.approvers && approvalData.approvers.length > 0 && (
                    <div className="mt-3">
                      <span className="text-sm font-medium app-text mb-2 block">
                        Admin Approvers ({approvalData.approvers.length}):
                      </span>
                      <div className="space-y-2">
                        {approvalData.approvers.map((approver, index) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between p-2 app-bg-neutral rounded-lg text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 app-text-subtle" />
                              <span className="app-text font-medium">{approver.approverName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs app-text-subtle">
                                {new Date(approver.approvalDate).toLocaleString()}
                              </span>
                              <div className="flex items-center gap-1 text-xs app-text-subtle" title={approver.approverWallet}>
                                <Wallet className="h-3 w-3" />
                                <code>{approver.approverWallet.substring(0, 6)}...{approver.approverWallet.substring(38)}</code>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Blockchain timestamp */}
                  {approvalData.blockchainTimestamp && (
                    <div className="text-xs app-text-subtle mt-2">
                      Registered on blockchain: {new Date(approvalData.blockchainTimestamp).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm app-text-subtle">No approval history available</p>
              )}
            </div>

            {/* Renewal Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold app-text mb-4 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 app-text-primary" />
                Certificate Renewal
              </h3>
              
              {isExpired ? (
                <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        Certificate Expired
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        This certificate expired {daysUntilExpiration ? Math.abs(daysUntilExpiration) : '?'} days ago on {formatDate(product.expirationDate)}.
                        Submit a renewal request to extend the certificate.
                      </p>
                      <Button
                        onClick={handleRenewal}
                        disabled={isRenewing}
                        className="mt-3 bg-red-600 hover:bg-red-700"
                        size="sm"
                      >
                        {isRenewing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Request Renewal
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        Certificate Valid
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {daysUntilExpiration && daysUntilExpiration > 0 ? (
                          <>Expires in {daysUntilExpiration} days on {formatDate(product.expirationDate)}.</>
                        ) : (
                          <>Valid until {formatDate(product.expirationDate)}.</>
                        )}
                        {' '}Renewal is not available until the certificate has expired.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t mt-6">
              <h3 className="text-lg font-semibold app-text mb-4">
                Certificate
              </h3>
              <div className="p-4 app-bg-primary-soft border border-[color:var(--app-primary)]/30 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium app-text-primary mb-1">
                      Official Product Certificate
                    </p>
                    <p className="text-xs app-text-subtle">
                      Download an official certificate with QR code for
                      verification
                    </p>
                  </div>
                  <Button
                    onClick={handleDownloadCertificate}
                    disabled={isDownloading}
                    className="app-bg-primary hover:opacity-90 shrink-0 disabled:opacity-50"
                    size="sm"
                  >
                    <Download className={`h-4 w-4 mr-2 ${isDownloading ? 'animate-pulse' : ''}`} />
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
