import { useState, useEffect } from "react";
import { X, RefreshCw, Check, ExternalLink, Loader2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { toast } from "react-toastify";
import { PDFGenerationService } from "@/services/pdfGenerationService";
import type { Product } from "@/typeorm/entities/product.entity";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface TimelineEvent {
  type: 'initial' | 'renewal' | 'update' | 'archive' | 'unarchive';
  certificateId: string;
  approvalId: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  approvedAt?: string;
  approvers: Array<{
    approverName: string;
    approverWallet: string;
    approvalDate: string;
  }>;
  blockchainTxHash?: string;
  expirationDate?: string;
}

interface CertificateTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  isPublic?: boolean; // If true, don't send credentials for authentication
}

export default function CertificateTimelineModal({
  isOpen,
  onClose,
  productId,
  productName,
  isPublic = false,
}: CertificateTimelineModalProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [productData, setProductData] = useState<Product | null>(null);
  const [regeneratingCertId, setRegeneratingCertId] = useState<string | null>(null);
  const [selectedCertificateId, setSelectedCertificateId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && productId) {
      fetchTimeline();
      fetchProductData();
    }
  }, [isOpen, productId]);

  // Disable background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Check if scroll is already locked by parent modal
      const isAlreadyLocked = document.body.style.position === 'fixed';
      
      if (!isAlreadyLocked) {
        const html = document.documentElement;
        const body = document.body;
        const scrollY = window.scrollY;

        html.style.overflow = "hidden";
        body.style.overflow = "hidden";
        body.style.position = "fixed";
        body.style.width = "100%";
        body.style.top = `-${scrollY}px`;

        // Store cleanup info only if we applied the lock
        body.dataset.timelineAppliedLock = "true";
        body.dataset.timelineScrollY = scrollY.toString();

        return () => {
          // Only restore if we were the ones who applied the lock
          if (body.dataset.timelineAppliedLock === "true") {
            html.style.overflow = "";
            body.style.overflow = "";
            body.style.position = "";
            body.style.width = "";
            body.style.top = "";
            
            const scrollY = parseInt(body.dataset.timelineScrollY || '0');
            window.scrollTo(0, scrollY);
            
            // Clean up
            delete body.dataset.timelineAppliedLock;
            delete body.dataset.timelineScrollY;
          }
        };
      }
      // If already locked, we don't need to do anything or clean up
    }
  }, [isOpen]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const timelineEndpoint = isPublic 
        ? `${API_URL}/certificate-approval/public/renewal-timeline/${productId}`
        : `${API_URL}/certificate-approval/renewal-timeline/${productId}`;
      
      const response = await axios.get(
        timelineEndpoint,
        isPublic ? {} : { withCredentials: true }
      );

      if (response.data.success) {
        // Map backend timeline data to TimelineEvent format
        const timelineData = response.data.data?.timeline || [];
        const mappedTimeline = timelineData.map((item: any) => {
          let type: TimelineEvent['type'] = 'initial';
          if (item.isRenewal) type = 'renewal';
          else if (item.isUpdate) type = 'update';
          else if (item.isArchive) type = 'archive';
          else if (item.isUnarchive) type = 'unarchive';

          return {
            type,
            certificateId: item.certificateId,
            approvalId: item.approvalId,
            status: 'approved', // Timeline only shows approved items
            submittedAt: item.createdDate,
            approvedAt: item.approvedDate,
            approvers: item.approvers || [],
            blockchainTxHash: item.transactionHash,
            expirationDate: item.renewalMetadata?.newExpirationDate
          };
        });
        setTimeline(mappedTimeline || []);
        
        // Auto-select the first (most recent) certificate
        if (mappedTimeline && mappedTimeline.length > 0) {
          setSelectedCertificateId(mappedTimeline[0].certificateId);
        }
      } else {
        toast.error("Failed to load timeline");
      }
    } catch (error: any) {
      console.error("Error fetching timeline:", error);
      toast.error(error.response?.data?.message || "Failed to load timeline");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductData = async () => {
    try {
      const productEndpoint = isPublic
        ? `${API_URL}/public/product/${productId}`
        : `${API_URL}/product/products/${productId}`;
      
      const response = await axios.get(
        productEndpoint,
        isPublic ? {} : { withCredentials: true }
      );
      if (response.data) {
        setProductData(response.data);
      }
    } catch (error: any) {
      console.error("Error fetching product data:", error);
    }
  };

  const handleRegenerateCertificate = async () => {
    if (!productData) {
      toast.error("Product data not loaded");
      return;
    }

    if (!selectedCertificateId) {
      toast.error("Please select a certificate from the timeline");
      return;
    }

    setRegeneratingCertId(selectedCertificateId);
    try {
      // Regenerate PDF with the consistent certificate ID
      await PDFGenerationService.generateAndDownloadProductCertificate(
        productData,
        selectedCertificateId
      );
      toast.success(isPublic ? "Certificate downloaded successfully!" : "Certificate regenerated successfully!");
    } catch (error: any) {
      console.error("Error regenerating certificate:", error);
      toast.error("Failed to regenerate certificate");
    } finally {
      setRegeneratingCertId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'initial':
        return <Badge variant="default">Initial</Badge>;
      case 'renewal':
        return <Badge className="bg-blue-600">Renewal</Badge>;
      case 'update':
        return <Badge className="bg-purple-600">Update</Badge>;
      case 'archive':
        return <Badge className="bg-red-600">Archive</Badge>;
      case 'unarchive':
        return <Badge className="bg-green-600">Unarchive</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
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
            <h2 className="text-xl font-bold app-text">
              Certificate Timeline
            </h2>
            <p className="text-sm app-text-subtle mt-1">{productName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegenerateCertificate}
              disabled={!selectedCertificateId || regeneratingCertId !== null || !productData}
              className="app-bg-primary app-text-white hover:app-bg-secondary"
            >
              {regeneratingCertId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isPublic ? 'Downloading...' : 'Generating...'}
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  {isPublic ? 'Download' : 'Download'}
                </>
              )}
            </Button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : timeline.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No timeline events found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {timeline.map((event) => (
                <div 
                  key={event.approvalId} 
                  onClick={() => setSelectedCertificateId(event.certificateId)}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedCertificateId === event.certificateId 
                      ? 'border-teal-500 bg-teal-50' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getEventBadge(event.type)}
                      <Badge
                        variant={
                          event.status === 'approved'
                            ? 'default'
                            : event.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                    {selectedCertificateId === event.certificateId && (
                      <Check className="h-5 w-5 text-teal-600" />
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700">
                      <span className="font-medium">Certificate ID:</span>{' '}
                      <span className="font-mono text-xs">{event.certificateId}</span>
                    </p>

                    <p className="text-gray-600">
                      <span className="font-medium">Submitted:</span> {formatDate(event.submittedAt)}
                    </p>

                    {event.approvedAt && (
                      <p className="text-gray-600">
                        <span className="font-medium">Approved:</span> {formatDate(event.approvedAt)}
                      </p>
                    )}

                    {event.expirationDate && (
                      <p className="text-gray-600">
                        <span className="font-medium">Expiration:</span> {formatDate(event.expirationDate)}
                      </p>
                    )}

                    {event.blockchainTxHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${event.blockchainTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View on Blockchain
                      </a>
                    )}

                    {event.approvers && event.approvers.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          Approvers ({event.approvers.length})
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {event.approvers.map((approver, idx) => (
                            <div key={idx} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                              <p className="font-medium">{approver.approverName}</p>
                              <p className="font-mono text-gray-500">{approver.approverWallet.slice(0, 10)}...{approver.approverWallet.slice(-8)}</p>
                              <p className="text-gray-500">{formatDate(approver.approvalDate)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
