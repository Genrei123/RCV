import { useState, useEffect } from "react";
import { X, RefreshCw, Check, XCircle, Clock, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { toast } from "react-toastify";

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
}

export default function CertificateTimelineModal({
  isOpen,
  onClose,
  productId,
  productName,
}: CertificateTimelineModalProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && productId) {
      fetchTimeline();
    }
  }, [isOpen, productId]);

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

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/certificate-approval/renewal-timeline/${productId}`,
        { withCredentials: true }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEventIcon = (event: TimelineEvent) => {
    if (event.status === 'approved') {
      return <Check className="h-5 w-5 text-green-600" />;
    } else if (event.status === 'rejected') {
      return <XCircle className="h-5 w-5 text-red-600" />;
    } else {
      return <Clock className="h-5 w-5 text-yellow-600" />;
    }
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
          <div>
            <h2 className="text-xl font-bold app-text flex items-center gap-2">
              <RefreshCw className="h-5 w-5 app-text-primary" />
              Certificate Timeline
            </h2>
            <p className="text-sm app-text-subtle mt-1">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:app-bg-neutral rounded-lg transition-colors"
          >
            <X className="h-5 w-5 app-text-subtle" />
          </button>
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
            <div className="space-y-6">
              {timeline.map((event, index) => (
                <div key={event.approvalId} className="flex gap-4">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div className="p-2 bg-gray-100 rounded-full">
                      {getEventIcon(event)}
                    </div>
                    {index < timeline.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 my-2" />
                    )}
                  </div>

                  {/* Event content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-center gap-2 mb-2">
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

                    <p className="text-sm text-gray-600 mb-2">
                      Certificate ID: <span className="font-mono font-medium">{event.certificateId}</span>
                    </p>

                    <p className="text-sm text-gray-600 mb-2">
                      Submitted: {formatDate(event.submittedAt)}
                    </p>

                    {event.approvedAt && (
                      <p className="text-sm text-gray-600 mb-2">
                        Approved: {formatDate(event.approvedAt)}
                      </p>
                    )}

                    {event.expirationDate && (
                      <p className="text-sm text-gray-600 mb-2">
                        Expiration: {formatDate(event.expirationDate)}
                      </p>
                    )}

                    {event.blockchainTxHash && (
                      <a
                        href={`https://sepolia.etherscan.io/tx/${event.blockchainTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View on Blockchain
                      </a>
                    )}

                    {event.approvers && event.approvers.length > 0 && (
                      <div className="mt-3 bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-gray-700 mb-2">
                          Approvers ({event.approvers.length})
                        </p>
                        <div className="space-y-2">
                          {event.approvers.map((approver, idx) => (
                            <div key={idx} className="text-xs text-gray-600">
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
