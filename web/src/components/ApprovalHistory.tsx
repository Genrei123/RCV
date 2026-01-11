import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ExternalLink,
  Loader2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Link2,
} from 'lucide-react';
import {
  CertificateApprovalService,
  type CertificateApproval,
  type ApprovalStatus,
} from '@/services/approvalService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ApprovalHistoryProps {
  isAdmin?: boolean;
}

const ApprovalHistory: React.FC<ApprovalHistoryProps> = ({ isAdmin = false }) => {
  const [approvals, setApprovals] = useState<CertificateApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<CertificateApproval | null>(null);
  const [activeTab, setActiveTab] = useState<ApprovalStatus | 'all'>('all');

  const fetchApprovals = async (status?: ApprovalStatus) => {
    try {
      setLoading(true);
      setError(null);

      let data: CertificateApproval[];
      if (status && isAdmin) {
        data = await CertificateApprovalService.getApprovalsByStatus(status);
      } else if (isAdmin && status === undefined) {
        // Fetch all statuses for admin
        const [pending, approved, rejected] = await Promise.all([
          CertificateApprovalService.getApprovalsByStatus('pending'),
          CertificateApprovalService.getApprovalsByStatus('approved'),
          CertificateApprovalService.getApprovalsByStatus('rejected'),
        ]);
        data = [...pending, ...approved, ...rejected];
      } else {
        data = await CertificateApprovalService.getApprovalHistory();
      }

      setApprovals(data);
    } catch (err: any) {
      console.error('Failed to fetch approvals:', err);
      setError(err.response?.data?.message || 'Failed to load approval history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'all') {
      fetchApprovals();
    } else {
      fetchApprovals(activeTab as ApprovalStatus);
    }
  }, [activeTab, isAdmin]);

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

  const filteredApprovals = approvals.filter((approval) => {
    if (activeTab === 'all') return true;
    return approval.status === activeTab;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Approval History</h2>
          <p className="text-muted-foreground">
            {isAdmin ? 'All certificate approvals' : 'Your approval activity'}
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchApprovals()} disabled={loading}>
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

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ApprovalStatus | 'all')}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredApprovals.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No approvals found</h3>
              <p className="text-muted-foreground">
                {activeTab === 'all'
                  ? 'No approval history to display.'
                  : `No ${activeTab} approvals found.`}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Tx Hash</TableHead>
                    <TableHead>Blockchain Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApprovals.map((approval) => (
                    <TableRow key={approval._id}>
                      <TableCell className="font-medium">{approval.entityName}</TableCell>
                      <TableCell className="capitalize">{approval.entityType}</TableCell>
                      <TableCell>{getStatusBadge(approval.status)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {CertificateApprovalService.getApprovalProgressText(approval)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {CertificateApprovalService.formatDate(approval.createdAt)}
                      </TableCell>
                      <TableCell>
                        {approval.blockchainTxHash ? (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${approval.blockchainTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-mono"
                            title={approval.blockchainTxHash}
                          >
                            <Link2 className="w-3 h-3" />
                            {approval.blockchainTxHash.substring(0, 10)}...
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {approval.blockchainTimestamp
                          ? CertificateApprovalService.formatDate(approval.blockchainTimestamp)
                          : <span className="text-xs">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedApproval(approval)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Approval Details</DialogTitle>
            <DialogDescription>
              Complete information about this certificate approval.
            </DialogDescription>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                  Certificate Information
                </h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entity Name:</span>
                    <span className="font-medium">{selectedApproval.entityName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="capitalize">{selectedApproval.entityType}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status:</span>
                    {getStatusBadge(selectedApproval.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted:</span>
                    <span>{CertificateApprovalService.formatDate(selectedApproval.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Submitter Info */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm uppercase text-muted-foreground">Submitter</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{selectedApproval.submitterName || 'N/A'}</span>
                  </div>
                  {selectedApproval.submitterWallet && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Wallet:</span>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {selectedApproval.submitterWallet.substring(0, 10)}...
                      </code>
                    </div>
                  )}
                </div>
              </div>

              {/* Approvers */}
              {(selectedApproval.firstApproverName || selectedApproval.secondApproverName) && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                    Approvers
                  </h4>
                  <div className="space-y-3">
                    {selectedApproval.firstApproverName && (
                      <div className="p-3 bg-green-50 rounded-lg text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-medium">First Approval</span>
                        </div>
                        <div className="text-muted-foreground">
                          {selectedApproval.firstApproverName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {CertificateApprovalService.formatDate(selectedApproval.firstApprovalDate)}
                        </div>
                      </div>
                    )}
                    {selectedApproval.secondApproverName && (
                      <div className="p-3 bg-green-50 rounded-lg text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-medium">Second Approval</span>
                        </div>
                        <div className="text-muted-foreground">
                          {selectedApproval.secondApproverName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {CertificateApprovalService.formatDate(selectedApproval.secondApprovalDate)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Rejection Info */}
              {selectedApproval.status === 'rejected' && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                    Rejection Details
                  </h4>
                  <div className="p-3 bg-red-50 rounded-lg text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="font-medium">Rejected by {selectedApproval.rejectorName}</span>
                    </div>
                    <div className="text-muted-foreground mt-2">
                      <span className="font-medium">Reason:</span> {selectedApproval.rejectionReason}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {CertificateApprovalService.formatDate(selectedApproval.rejectionDate)}
                    </div>
                  </div>
                </div>
              )}

              {/* Blockchain Info */}
              {selectedApproval.blockchainTxHash && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                    Blockchain Record
                  </h4>
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-muted-foreground">Transaction:</span>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${selectedApproval.blockchainTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        {selectedApproval.blockchainTxHash.substring(0, 12)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {selectedApproval.blockchainBlockNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Block:</span>
                        <span>{selectedApproval.blockchainBlockNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PDF Hash */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm uppercase text-muted-foreground">PDF Hash</h4>
                <code className="block p-3 bg-muted rounded text-xs break-all">
                  {selectedApproval.pdfHash}
                </code>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalHistory;
