import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  Shield,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  CertificateApprovalService,
  type CertificateApproval,
} from "@/services/approvalService";
import { useMetaMask } from "@/contexts/MetaMaskContext";
import { AuthService } from "@/services/authService";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/typeorm/entities/product.entity";
import type { Company } from "@/typeorm/entities/company.entity";
import { CompanyDetailsModal } from "./CompanyDetailsModal";
import ApprovalQueueModal, {
  type PendingCompanyDetails,
  type PendingProductDetails,
} from "./ApprovalQueueModal";

interface ApprovalQueueProps {
  isAdmin?: boolean;
}

const ApprovalQueue: React.FC<ApprovalQueueProps> = ({ isAdmin = false }) => {
  const [pendingApprovals, setPendingApprovals] = useState<
    CertificateApproval[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] =
    useState<CertificateApproval | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [modalData, setModalData] = useState<
    PendingProductDetails | PendingCompanyDetails | null
  >(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const { walletAddress, isConnected } = useMetaMask();

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await AuthService.getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        console.error("Failed to fetch current user:", err);
      }
    };
    fetchUser();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      const approvals = isAdmin
        ? await CertificateApprovalService.getAllPendingApprovals()
        : await CertificateApprovalService.getPendingApprovals();
      setPendingApprovals(approvals);
    } catch (err: any) {
      console.error("Failed to fetch approvals:", err);
      setError(
        err.response?.data?.message || "Failed to load pending approvals",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingApprovals();
  }, [isAdmin]);

  const handleApprove = async () => {
    if (!selectedApproval || !walletAddress) return;

    try {
      setProcessing(true);
      setError(null);

      const { isFullyApproved } =
        await CertificateApprovalService.approveWithSignature(
          selectedApproval._id,
          walletAddress,
        );

      alert(
        isFullyApproved
          ? "Certificate fully approved and registered on the blockchain! ✓"
          : `Approval recorded (${selectedApproval.approvalCount + 1}/${selectedApproval.requiredApprovals}). Awaiting remaining approvals.`,
      );

      // Remove from pending list
      setPendingApprovals((prev) =>
        prev.filter((a) => a._id !== selectedApproval._id),
      );
      setSelectedApproval(null);
      setActionType(null);
    } catch (err: any) {
      console.error("Approval failed:", err);
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to approve";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval || !walletAddress || !rejectionReason.trim()) return;

    try {
      setProcessing(true);
      setError(null);

      await CertificateApprovalService.rejectWithSignature(
        selectedApproval._id,
        rejectionReason.trim(),
        walletAddress,
      );

      alert("Certificate rejected");

      // Remove from pending list
      setPendingApprovals((prev) =>
        prev.filter((a) => a._id !== selectedApproval._id),
      );
      setSelectedApproval(null);
      setActionType(null);
      setRejectionReason("");
    } catch (err: any) {
      console.error("Rejection failed:", err);
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to reject";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const openApprovalDialog = (
    approval: CertificateApproval,
    action: "approve" | "reject",
  ) => {
    setSelectedApproval(approval);
    setActionType(action);
    setRejectionReason("");
    setError(null);
  };

  const closeDialog = () => {
    setSelectedApproval(null);
    setActionType(null);
    setRejectionReason("");
    setError(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200"
          >
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200"
          >
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canUserApprove = (approval: CertificateApproval): boolean => {
    if (!currentUser?._id) return false;
    return CertificateApprovalService.canUserApprove(approval, currentUser._id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading approvals...</span>
      </div>
    );
  }

  if (!isConnected || !walletAddress) {
    return (
      <div className="m-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <span>
          Please connect your MetaMask wallet to view and process certificate
          approvals.
        </span>
      </div>
    );
  }

  const handleView = async (SelectedCertificate: CertificateApproval) => {
    try {
      setIsModalLoading(true);
      const response = await CertificateApprovalService.getApprovalById(
        SelectedCertificate._id,
      );
      console.log("Certificate Details:", response);

      if (response.entityType === "product") {
        const productData = response.pendingEntityData as PendingProductDetails;
        setModalData(productData);
        console.log("Product details set in modal data", productData);
      } else if (response.entityType === "company") {
        const companyDetails = {
          companyName: response?.entityName,
          status: response?.status,
          submittedBy: response?.submittedBy,
          submittedByName: response?.submitterName,
          submittedByWallet: response?.submitterWallet,
          updatedAt: response?.updatedAt,
        };

        if (!companyDetails.companyName) {
          throw new Error("Company details not found");
        } else {
          setModalData(companyDetails as PendingCompanyDetails);
          console.log("Company details set in modal data", companyDetails);
        }
      }
    } catch (error) {
      console.error("Error viewing certificate details:", error);
      setModalData(null); // Reset on error
    } finally {
      setIsModalLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Certificate Approvals</h2>
          <p className="text-muted-foreground">
            {isAdmin
              ? "All pending approvals"
              : "Pending approvals for your review"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchPendingApprovals}
          disabled={loading}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Approval Cards */}
      {pendingApprovals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium">All caught up!</h3>
            <p className="text-muted-foreground">
              No pending approvals at this time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pendingApprovals.map((approval) => (
            <Card
              key={approval._id}
              className="flex flex-col cursor-pointer"
              onClick={() => handleView(approval)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">
                    {approval.entityName}
                  </CardTitle>
                  {getStatusBadge(approval.status)}
                </div>
                <CardDescription className="flex items-center gap-2r">
                  <FileText className="w-4 h-4" />
                  {approval.entityType === "product"
                    ? "Product Certificate"
                    : "Company Certificate"}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-grow space-y-3">
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>
                      Submitted by: {approval.submitterName || "Unknown"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    <span>
                      {CertificateApprovalService.getApprovalProgressText(
                        approval,
                      )}
                    </span>
                  </div>

                  {/* Show entity creation status */}
                  {approval.pendingEntityData && !approval.entityCreated && (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded text-xs">
                      <Clock className="w-3 h-3" />
                      <span>
                        {approval.entityType === "product"
                          ? "Product"
                          : "Company"}{" "}
                        will be created after full approval
                      </span>
                    </div>
                  )}

                  {approval.entityCreated && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded text-xs">
                      <CheckCircle className="w-3 h-3" />
                      <span>
                        {approval.entityType === "product"
                          ? "Product"
                          : "Company"}{" "}
                        has been created
                      </span>
                    </div>
                  )}

                  {/* Show approvers list */}
                  {approval.approvers && approval.approvers.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded space-y-1">
                      <span className="font-medium">Approvers:</span>
                      {approval.approvers.map((approver, index) => (
                        <div
                          key={index}
                          className="ml-2 flex items-center gap-1"
                        >
                          {index + 1}. {approver.approverName}
                          {approver.signature === "submission-auto-approval" ? (
                            <span className="text-blue-600 text-xs">
                              (auto: submitted)
                            </span>
                          ) : (
                            <span>
                              {" "}
                              -{" "}
                              {CertificateApprovalService.formatDate(
                                approver.approvalDate,
                              )}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fallback to legacy first approver if no approvers array */}
                  {(!approval.approvers || approval.approvers.length === 0) &&
                    approval.firstApproverName && (
                      <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                        <span className="font-medium">First Approver:</span>{" "}
                        {approval.firstApproverName}
                        <br />
                        <span className="text-xs">
                          {CertificateApprovalService.formatDate(
                            approval.firstApprovalDate,
                          )}
                        </span>
                      </div>
                    )}

                  <div className="text-xs mt-2">
                    <span className="font-medium">PDF Hash:</span>
                    <code className="ml-1 p-1 bg-muted rounded text-xs break-all">
                      {approval.pdfHash.substring(0, 20)}...
                    </code>
                  </div>

                  {/* Show submission version if resubmitted */}
                  {approval.submissionVersion &&
                    approval.submissionVersion > 1 && (
                      <div className="text-xs mt-1 text-orange-600">
                        Resubmission #{approval.submissionVersion}
                      </div>
                    )}
                </div>
              </CardContent>

              <CardFooter className="flex gap-2 pt-4 border-t">
                {canUserApprove(approval) ? (
                  <>
                    <Button
                      className="flex-1"
                      onClick={() => openApprovalDialog(approval, "approve")}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => openApprovalDialog(approval, "reject")}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </>
                ) : (
                  <div className="flex-1 text-center text-sm text-muted-foreground">
                    {/* Check if user already approved (including auto-approval on submission) */}
                    {approval.approvers?.some(
                      (a) =>
                        a.approverId === currentUser?._id &&
                        a.signature === "submission-auto-approval",
                    )
                      ? "✓ Your submission counts as approval"
                      : approval.approvers?.some(
                            (a) => a.approverId === currentUser?._id,
                          ) || approval.firstApproverId === currentUser?._id
                        ? "✓ Already approved by you"
                        : approval.submittedBy === currentUser?._id
                          ? "You submitted this (not an admin)"
                          : "Cannot approve"}
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Approval/Rejection Dialog */}
      <Dialog
        open={!!selectedApproval && !!actionType}
        onOpenChange={() => closeDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Approve Certificate
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  Reject Certificate
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "You are about to sign and approve this certificate. This action requires your MetaMask signature."
                : "Please provide a reason for rejection. This action requires your MetaMask signature."}
            </DialogDescription>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-4 py-4">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Entity:</span>{" "}
                  {selectedApproval.entityName}
                </div>
                <div>
                  <span className="font-medium">Type:</span>{" "}
                  {selectedApproval.entityType === "product"
                    ? "Product"
                    : "Company"}
                </div>
                <div className="break-all">
                  <span className="font-medium">PDF Hash:</span>
                  <code className="ml-1 p-1 bg-muted rounded text-xs">
                    {selectedApproval.pdfHash}
                  </code>
                </div>
              </div>

              {actionType === "reject" && (
                <div className="space-y-2">
                  <label
                    htmlFor="rejection-reason"
                    className="text-sm font-medium"
                  >
                    Rejection Reason *
                  </label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Please explain why this certificate is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span>
                  Your wallet ({walletAddress?.substring(0, 10)}...) will be
                  used to sign this{" "}
                  {actionType === "approve" ? "approval" : "rejection"}.
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={processing}
            >
              Cancel
            </Button>
            {actionType === "approve" ? (
              <Button onClick={handleApprove} disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Sign & Approve
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Sign & Reject
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modals for product/company details */}
      {isModalLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}

      {modalData && !isModalLoading && (
        <ApprovalQueueModal
          entityType={"companyName" in modalData ? "company" : "product"}
          isOpen={true}
          onClose={() => setModalData(null)}
          data={modalData}
        />
      )}
    </div>
  );
};

export default ApprovalQueue;
