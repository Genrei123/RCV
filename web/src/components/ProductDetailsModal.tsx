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
import { EditProductModal } from "@/components/EditProductModal";
import { Edit, Archive } from "lucide-react";
import CertificateTimelineModal from "@/components/CertificateTimelineModal";

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
  onRenewalSuccess?: () => void;
  companies?: Array<{ _id: string; name: string }>;
}

export function ProductDetailsModal({
  isOpen,
  onClose,
  product,
  onRenewalSuccess,
  companies = [],
}: ProductDetailsModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [approvalData, setApprovalData] = useState<ApprovalData | null>(null);
  const [loadingApproval, setLoadingApproval] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [hasPendingApproval, setHasPendingApproval] = useState(false);
  const [checkingPending, setCheckingPending] = useState(false);

  // Check for pending approvals when product changes
  useEffect(() => {
    if (isOpen && product) {
      checkPendingApproval();
    }
  }, [isOpen, product]);

  const checkPendingApproval = async () => {
    if (!product?._id) return;
    
    setCheckingPending(true);
    try {
      const response = await axios.get(
        `${API_URL}/certificate-approval/entity/product/${product._id}`,
        { withCredentials: true }
      );
      
      // Check if there's a pending approval
      const hasPending = response.data.data?.status === 'pending';
      setHasPendingApproval(hasPending);
    } catch (error) {
      // If no approval found or error, assume no pending approval
      setHasPendingApproval(false);
    } finally {
      setCheckingPending(false);
    }
  };

  // Disable background scroll when modal is open (match AddAgentModal behavior)
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
        `${API_URL}/certificate-approval/renewProduct`,
        {
          entityId: product._id,
          forcePush: false
        },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        toast.success('Renewal request submitted successfully! It will be reviewed by administrators.');
        onRenewalSuccess?.(); // Trigger refresh in parent
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

  const handleArchive = async () => {
    if (!product || isArchiving) return;
    
    if (!window.confirm("Submit archive request for admin approval? The product will be archived after approval.")) {
      return;
    }

    setIsArchiving(true);
    try {
      await axios.post(
        `${API_URL}/certificate-approval/archiveProduct`,
        { entityId: product._id },
        { withCredentials: true }
      );
      toast.success("Archive request submitted for admin approval");
      if (onRenewalSuccess) onRenewalSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error submitting archive request:", error);
      toast.error(error.response?.data?.message || "Failed to submit archive request");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleUnarchive = async () => {
    if (!product || isArchiving) return;
    
    if (!window.confirm("Submit unarchive request for admin approval? The product will be restored after approval.")) {
      return;
    }

    setIsArchiving(true);
    try {
      await axios.post(
        `${API_URL}/certificate-approval/unarchiveProduct`,
        { entityId: product._id },
        { withCredentials: true }
      );
      toast.success("Unarchive request submitted for admin approval");
      if (onRenewalSuccess) onRenewalSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error submitting unarchive request:", error);
      toast.error(error.response?.data?.message || "Failed to submit unarchive request");
    } finally {
      setIsArchiving(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-hidden">
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
              {product.isArchived && (
                <Badge variant="destructive" className="mt-2">
                  ARCHIVED
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {product.sepoliaTransactionId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTimelineModal(true)}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Timeline
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditModal(true)}
              disabled={hasPendingApproval || checkingPending}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm"
              title={hasPendingApproval ? "Cannot edit - pending approval exists" : ""}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            {!product.isArchived && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchive}
                disabled={isArchiving || hasPendingApproval || checkingPending}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50"
                title={hasPendingApproval ? "Cannot archive - pending approval exists" : ""}
              >
                {isArchiving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4 mr-2" />
                )}
                Archive
              </Button>
            )}
            {product.isArchived && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnarchive}
                disabled={isArchiving || hasPendingApproval || checkingPending}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-green-600 hover:text-green-700 border-green-200 hover:border-green-300 hover:bg-green-50"
                title={hasPendingApproval ? "Cannot unarchive - pending approval exists" : ""}
              >
                {isArchiving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Unarchive
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:app-bg-neutral rounded-lg transition-colors"
            >
              <X className="h-5 w-5 app-text-subtle" />
            </button>
          </div>
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
                        disabled={isRenewing || hasPendingApproval || checkingPending}
                        className="mt-3 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        variant={hasPendingApproval ? "outline" : "default"}
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

      {/* Edit Modal */}
      {showEditModal && product && (
        <EditProductModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            if (onRenewalSuccess) onRenewalSuccess(); // Reuse refresh logic
            toast.success("Update request submitted.");
          }}
          product={product}
          companies={companies || []}
        />
      )}

      {/* Certificate Timeline Modal */}
      <CertificateTimelineModal
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        productId={product?._id || ''}
        productName={product?.productName || ''}
      />
    </div>
  );
}
