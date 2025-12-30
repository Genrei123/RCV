// =========================================================================
// PENDING AGENTS PAGE - Admin Review of Agent Registrations
// =========================================================================
// This page allows administrators to review, approve, or reject
// agent registrations that are pending approval.
// =========================================================================

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  BadgeCheck,
  Eye,
  RefreshCw,
  Search,
  FileText,
  Image,
  Loader2,
  Send,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { AdminInviteService, type AdminInvite } from "@/services/adminInviteService";
import { AddAgentModal } from "@/components/AddAgentModal";
import { toast } from "react-toastify";

// Utility function to format dates
const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', options || { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

interface PendingAgentsProps {
  user: {
    _id: string;
    role: string;
    isSuperAdmin?: boolean;
    fullName?: string;
    firstName?: string;
  };
}

export function PendingAgents({ user }: PendingAgentsProps) {
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [filteredInvites, setFilteredInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Modal states
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Selected invite for actions
  const [selectedInvite, setSelectedInvite] = useState<AdminInvite | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Check if user has admin access
  const hasAdminAccess = user?.role === 'ADMIN' || user?.isSuperAdmin;

  useEffect(() => {
    if (hasAdminAccess) {
      fetchInvites();
    }
  }, [hasAdminAccess]);

  useEffect(() => {
    filterInvites();
  }, [invites, searchTerm, statusFilter]);

  const fetchInvites = async () => {
    setLoading(true);
    try {
      const response = await AdminInviteService.getAllInvites();
      if (response.success) {
        setInvites(response.invites);
      }
    } catch (error) {
      console.error("Error fetching invites:", error);
      toast.error("Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  const filterInvites = () => {
    let filtered = [...invites];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (invite) =>
          invite.email.toLowerCase().includes(term) ||
          invite.badgeId.toLowerCase().includes(term) ||
          invite.invitedByName?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((invite) => invite.status === statusFilter);
    }

    setFilteredInvites(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case "badge_verified":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Badge Verified</Badge>;
      case "registered":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">Registered</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleApprove = async (invite: AdminInvite) => {
    setActionLoading(true);
    try {
      const response = await AdminInviteService.approveAgent(invite._id);
      if (response.success) {
        toast.success("Agent approved successfully");
        fetchInvites();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve agent");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedInvite || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setActionLoading(true);
    try {
      const response = await AdminInviteService.rejectAgent(selectedInvite._id, rejectionReason);
      if (response.success) {
        toast.success("Agent registration rejected");
        setRejectDialogOpen(false);
        setRejectionReason("");
        setSelectedInvite(null);
        fetchInvites();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject agent");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResend = async (invite: AdminInvite) => {
    setActionLoading(true);
    try {
      const response = await AdminInviteService.resendInvite(invite._id);
      if (response.success) {
        toast.success("Invitation resent successfully");
        fetchInvites();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resend invitation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInvite) return;

    setActionLoading(true);
    try {
      const response = await AdminInviteService.deleteInvite(selectedInvite._id);
      if (response.success) {
        toast.success("Invitation deleted");
        setDeleteDialogOpen(false);
        setSelectedInvite(null);
        fetchInvites();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete invitation");
    } finally {
      setActionLoading(false);
    }
  };

  // Stats calculation
  const stats = {
    total: invites.length,
    pending: invites.filter((i) => i.status === "pending").length,
    registered: invites.filter((i) => i.status === "registered").length,
    approved: invites.filter((i) => i.status === "approved").length,
    rejected: invites.filter((i) => i.status === "rejected").length,
  };

  if (!hasAdminAccess) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-green-600" />
            Agent Management
          </h1>
          <p className="text-gray-600 mt-1">
            Invite new agents and manage registration approvals
          </p>
        </div>
        <Button
          onClick={() => setAddAgentOpen(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Agent
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("all")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-gray-500">Total Invites</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("pending")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("registered")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.registered}</p>
                <p className="text-xs text-gray-500">Awaiting Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("approved")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                <p className="text-xs text-gray-500">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("rejected")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                <p className="text-xs text-gray-500">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by email, badge ID, or inviter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={fetchInvites}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invites Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {statusFilter === "all" 
              ? "All Invitations" 
              : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace("_", " ")} Invitations`}
          </CardTitle>
          <CardDescription>
            {filteredInvites.length} invitation{filteredInvites.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : filteredInvites.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No invitations found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setAddAgentOpen(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite First Agent
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Badge ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvites.map((invite) => (
                    <TableRow key={invite._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {invite.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="w-4 h-4 text-gray-400" />
                          <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                            {invite.badgeId}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invite.status)}</TableCell>
                      <TableCell className="text-gray-600">
                        {invite.invitedByName || "System"}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {formatDate(invite.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* View Details */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInvite(invite);
                              setViewDetailsOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Actions based on status */}
                          {invite.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResend(invite)}
                                disabled={actionLoading}
                              >
                                <Send className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedInvite(invite);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}

                          {invite.status === "registered" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(invite)}
                                disabled={actionLoading}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedInvite(invite);
                                  setRejectDialogOpen(true);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Agent Modal */}
      <AddAgentModal
        open={addAgentOpen}
        onOpenChange={setAddAgentOpen}
        onSuccess={fetchInvites}
      />

      {/* View Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Invitation Details</DialogTitle>
          </DialogHeader>
          {selectedInvite && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedInvite.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Badge ID</p>
                  <code className="font-medium bg-gray-100 px-2 py-1 rounded">
                    {selectedInvite.badgeId}
                  </code>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedInvite.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Invited By</p>
                  <p className="font-medium">{selectedInvite.invitedByName || "System"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">
                    {formatDateTime(selectedInvite.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email Sent</p>
                  <p className="font-medium">
                    {selectedInvite.emailSent ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-red-500">No</span>
                    )}
                  </p>
                </div>
              </div>

              {selectedInvite.personalMessage && (
                <div>
                  <p className="text-sm text-gray-500">Personal Message</p>
                  <p className="mt-1 p-3 bg-blue-50 rounded-lg text-blue-800 italic">
                    "{selectedInvite.personalMessage}"
                  </p>
                </div>
              )}

              {selectedInvite.rejectionReason && (
                <div>
                  <p className="text-sm text-gray-500">Rejection Reason</p>
                  <p className="mt-1 p-3 bg-red-50 rounded-lg text-red-800">
                    {selectedInvite.rejectionReason}
                  </p>
                </div>
              )}

              {/* Document Verification - Show when documents exist */}
              {(selectedInvite.idDocumentUrl || selectedInvite.selfieWithIdUrl) && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Uploaded Documents
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedInvite.idDocumentUrl && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">ID Document</p>
                        <a
                          href={selectedInvite.idDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                            <img
                              src={selectedInvite.idDocumentUrl}
                              alt="ID Document"
                              className="w-full h-40 object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden p-4 bg-gray-50 flex items-center justify-center">
                              <Image className="w-8 h-8 text-gray-400" />
                            </div>
                            <div className="p-2 bg-gray-50 text-center text-sm text-blue-600">
                              Click to view full size
                            </div>
                          </div>
                        </a>
                      </div>
                    )}
                    {selectedInvite.selfieWithIdUrl && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Selfie with ID</p>
                        <a
                          href={selectedInvite.selfieWithIdUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                            <img
                              src={selectedInvite.selfieWithIdUrl}
                              alt="Selfie with ID"
                              className="w-full h-40 object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden p-4 bg-gray-50 flex items-center justify-center">
                              <Image className="w-8 h-8 text-gray-400" />
                            </div>
                            <div className="p-2 bg-gray-50 text-center text-sm text-blue-600">
                              Click to view full size
                            </div>
                          </div>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Approve/Reject Actions - Show for registered status */}
              {selectedInvite.status === "registered" && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApprove(selectedInvite)}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Approve Agent
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setViewDetailsOpen(false);
                        setRejectDialogOpen(true);
                      }}
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Agent Registration</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this registration. 
              The applicant will be notified via email.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Reject Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invitation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
