import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Shield,
  AlertTriangle,
  Loader2,
  RefreshCw,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import {
  CertificateApprovalService,
  type CertificateApproval,
} from '@/services/approvalService';
import { Pagination } from './Pagination';

interface MySubmissionsProps {
  currentPage?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
}

const MySubmissions: React.FC<MySubmissionsProps> = ({ 
  currentPage = 1, 
  onPageChange, 
  pageSize = 6 
}) => {
  const [submissions, setSubmissions] = useState<CertificateApproval[]>([]);
  const [rejectedSubmissions, setRejectedSubmissions] = useState<CertificateApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<CertificateApproval | null>(null);
  const [showResubmitDialog, setShowResubmitDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [allSubmissions, rejected] = await Promise.all([
        CertificateApprovalService.getMySubmissions(),
        CertificateApprovalService.getMyRejectedApprovals(),
      ]);
      
      setSubmissions(allSubmissions);
      setRejectedSubmissions(rejected);
    } catch (err: any) {
      console.error('Failed to fetch submissions:', err);
      setError(err.response?.data?.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Reset page to 1 when switching tabs
  useEffect(() => {
    onPageChange?.(1);
  }, [activeTab]);

  const handleResubmit = async () => {
    if (!selectedApproval) return;

    try {
      setProcessing(true);
      setError(null);

      await CertificateApprovalService.resubmitCertificate(selectedApproval._id);

      alert('Certificate resubmitted for approval successfully!');
      
      setShowResubmitDialog(false);
      setSelectedApproval(null);
      fetchSubmissions();
    } catch (err: any) {
      console.error('Resubmit failed:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to resubmit';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const openResubmitDialog = (approval: CertificateApproval) => {
    setSelectedApproval(approval);
    setShowResubmitDialog(true);
    setError(null);
  };

  const closeDialog = () => {
    setSelectedApproval(null);
    setShowResubmitDialog(false);
    setError(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBlockchainBadge = (approval: CertificateApproval) => {
    if (approval.blockchainTxHash) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Shield className="w-3 h-3 mr-1" />
          On Blockchain
        </Badge>
      );
    }
    return null;
  };

  const renderApprovalCard = (approval: CertificateApproval, showResubmit: boolean = false) => (
    <Card key={approval._id} className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{approval.entityName}</CardTitle>
          <div className="flex flex-col gap-1">
            {getStatusBadge(approval.status)}
            {getBlockchainBadge(approval)}
          </div>
        </div>
        <CardDescription className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {approval.entityType === 'product' ? 'Product Certificate' : 'Company Certificate'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow space-y-3">
        <div className="text-sm space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>
              {CertificateApprovalService.getApprovalProgressText(approval)}
            </span>
          </div>

          {/* Show approvers list */}
          {approval.approvers && approval.approvers.length > 0 && (
            <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded space-y-1">
              <span className="font-medium">Approvers:</span>
              {approval.approvers.map((approver, index) => (
                <div key={index} className="ml-2">
                  {index + 1}. {approver.approverName} - {CertificateApprovalService.formatDate(approver.approvalDate)}
                </div>
              ))}
            </div>
          )}

          {/* Show rejection reason if rejected */}
          {approval.status === 'rejected' && approval.rejectionReason && (
            <div className="text-xs p-2 bg-red-50 border border-red-200 rounded mt-2">
              <span className="font-medium text-red-700">Rejection Reason:</span>
              <p className="text-red-600 mt-1">{approval.rejectionReason}</p>
              {approval.rejectorName && (
                <p className="text-red-500 text-xs mt-1">
                  Rejected by: {approval.rejectorName}
                </p>
              )}
            </div>
          )}

          {/* Show blockchain info if registered */}
          {approval.blockchainTxHash && (
            <div className="text-xs p-2 bg-blue-50 border border-blue-200 rounded mt-2">
              <span className="font-medium text-blue-700">Blockchain Transaction:</span>
              <a
                href={`https://sepolia.etherscan.io/tx/${approval.blockchainTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 mt-1"
              >
                View on Etherscan <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Show submission version if resubmitted */}
          {approval.submissionVersion && approval.submissionVersion > 1 && (
            <div className="text-xs mt-1 text-orange-600">
              Resubmission #{approval.submissionVersion}
            </div>
          )}

          <div className="text-xs text-muted-foreground mt-2">
            Submitted: {CertificateApprovalService.formatDate(approval.createdAt)}
          </div>
        </div>
      </CardContent>

      {showResubmit && approval.status === 'rejected' && (
        <CardFooter className="pt-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => openResubmitDialog(approval)}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Resubmit for Approval
          </Button>
        </CardFooter>
      )}
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading submissions...</span>
      </div>
    );
  }

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const approvedSubmissions = submissions.filter(s => s.status === 'approved');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Submissions</h2>
          <p className="text-muted-foreground">
            Track the status of your certificate submissions
          </p>
        </div>
        <Button variant="outline" onClick={fetchSubmissions} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({submissions.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedSubmissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No submissions yet</h3>
                <p className="text-muted-foreground">
                  You haven't submitted any certificates for approval.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {(() => {
                const totalPages = Math.max(1, Math.ceil(submissions.length / pageSize));
                const startIndex = (currentPage - 1) * pageSize;
                const paginatedData = submissions.slice(
                  startIndex,
                  startIndex + pageSize
                );

                return (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {paginatedData.map((approval) => renderApprovalCard(approval))}
                    </div>
                    {paginatedData.length > 0 && (
                      <div className="mt-4 flex items-center justify-between w-full">
                        <div className="text-sm text-muted-foreground">
                          Showing {paginatedData.length} of {submissions.length} submissions • Page {currentPage} of {totalPages}
                        </div>
                        <div>
                          <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={submissions.length}
                            itemsPerPage={pageSize}
                            onPageChange={(p: number) => onPageChange?.(p)}
                            alwaysShowControls
                            showingText={null}
                          />
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {pendingSubmissions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="w-12 h-12 text-yellow-500 mb-4" />
                <h3 className="text-lg font-medium">No pending submissions</h3>
                <p className="text-muted-foreground">
                  All your submissions have been processed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {(() => {
                const totalPages = Math.max(1, Math.ceil(pendingSubmissions.length / pageSize));
                const startIndex = (currentPage - 1) * pageSize;
                const paginatedData = pendingSubmissions.slice(
                  startIndex,
                  startIndex + pageSize
                );

                return (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {paginatedData.map((approval) => renderApprovalCard(approval))}
                    </div>
                    {paginatedData.length > 0 && (
                      <div className="mt-4 flex items-center justify-between w-full">
                        <div className="text-sm text-muted-foreground">
                          Showing {paginatedData.length} of {pendingSubmissions.length} submissions • Page {currentPage} of {totalPages}
                        </div>
                        <div>
                          <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={pendingSubmissions.length}
                            itemsPerPage={pageSize}
                            onPageChange={(p: number) => onPageChange?.(p)}
                            alwaysShowControls
                            showingText={null}
                          />
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {approvedSubmissions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">No approved submissions</h3>
                <p className="text-muted-foreground">
                  None of your submissions have been approved yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {(() => {
                const totalPages = Math.max(1, Math.ceil(approvedSubmissions.length / pageSize));
                const startIndex = (currentPage - 1) * pageSize;
                const paginatedData = approvedSubmissions.slice(
                  startIndex,
                  startIndex + pageSize
                );

                return (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {paginatedData.map((approval) => renderApprovalCard(approval))}
                    </div>
                    {paginatedData.length > 0 && (
                      <div className="mt-4 flex items-center justify-between w-full">
                        <div className="text-sm text-muted-foreground">
                          Showing {paginatedData.length} of {approvedSubmissions.length} submissions • Page {currentPage} of {totalPages}
                        </div>
                        <div>
                          <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={approvedSubmissions.length}
                            itemsPerPage={pageSize}
                            onPageChange={(p: number) => onPageChange?.(p)}
                            alwaysShowControls
                            showingText={null}
                          />
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          {rejectedSubmissions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">No rejected submissions</h3>
                <p className="text-muted-foreground">
                  Great! None of your submissions have been rejected.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {(() => {
                const totalPages = Math.max(1, Math.ceil(rejectedSubmissions.length / pageSize));
                const startIndex = (currentPage - 1) * pageSize;
                const paginatedData = rejectedSubmissions.slice(
                  startIndex,
                  startIndex + pageSize
                );

                return (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {paginatedData.map((approval) => renderApprovalCard(approval, true))}
                    </div>
                    {paginatedData.length > 0 && (
                      <div className="mt-4 flex items-center justify-between w-full">
                        <div className="text-sm text-muted-foreground">
                          Showing {paginatedData.length} of {rejectedSubmissions.length} submissions • Page {currentPage} of {totalPages}
                        </div>
                        <div>
                          <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={rejectedSubmissions.length}
                            itemsPerPage={pageSize}
                            onPageChange={(p: number) => onPageChange?.(p)}
                            alwaysShowControls
                            showingText={null}
                          />
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Resubmit Dialog */}
      <Dialog open={showResubmitDialog} onOpenChange={() => closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-blue-500" />
                Resubmit Certificate
              </span>
            </DialogTitle>
            <DialogDescription>
              This will create a new approval request based on the rejected submission.
              All admins will need to approve again.
            </DialogDescription>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-4 py-4">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Entity:</span> {selectedApproval.entityName}
                </div>
                <div>
                  <span className="font-medium">Type:</span>{' '}
                  {selectedApproval.entityType === 'product' ? 'Product' : 'Company'}
                </div>
                {selectedApproval.rejectionReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <span className="font-medium text-red-700">Previous Rejection Reason:</span>
                    <p className="text-red-600 mt-1">{selectedApproval.rejectionReason}</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> Make sure you have addressed the rejection reason
                  before resubmitting. Consider updating the product/company details if needed.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleResubmit} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resubmitting...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Resubmit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MySubmissions;
