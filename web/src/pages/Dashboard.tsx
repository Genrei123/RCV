import { DataTable, type Column } from "@/components/DataTable";
import { PageContainer } from "@/components/PageContainer";
import { useState, useEffect } from "react";
import type { User } from "@/typeorm/entities/user.entity";
import { truncateText } from "@/utils/textTruncate";
import { Button } from "@/components/ui/button";
import { AuthService } from "@/services/authService";
import { AddAgentModal } from "@/components/AddAgentModal";
import { AdminInviteService, type AdminInvite } from "@/services/adminInviteService";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DashboardService,
  type DashboardStats,
} from "@/services/dashboardService";
import { UserDetailModal } from "@/components/UserDetailModal";
import { UserPageService } from "@/services/userPageService";
import { toast } from "react-toastify";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  Package, 
  Building2, 
  UserPlus, 
  Mail, 
  MoreHorizontal, 
  Pencil, 
  XCircle, 
  Archive, 
  Trash2,
  RefreshCw,
  Loader2,
  Monitor,
  Smartphone
} from "lucide-react";

export interface DashboardProps {
  success?: boolean;
  // users can be either an array (legacy) or a paginated payload { data: User[], pagination: { ... } }
  users?:
    | User[]
    | {
        data: User[];
        pagination?: {
          current_page?: number;
          per_page?: number;
          total_pages?: number;
          total_items?: number;
        };
      };
}

export function Dashboard(props: DashboardProps) {
  const [, setSearch] = useState<string>("");
  const [sortKey, setSortKey] = useState<"lastName" | "email" | "status">(
    "lastName"
  );
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const pageSize = 10;

  // View mode toggle: 'users' or 'invites'
  const [viewMode, setViewMode] = useState<"users" | "invites">("users");
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState<boolean>(false);

  // Edit invite modal state
  const [editInviteModalOpen, setEditInviteModalOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<AdminInvite | null>(null);
  const [editFormData, setEditFormData] = useState({ badgeId: "", email: "", personalMessage: "" });
  const [editLoading, setEditLoading] = useState(false);

  // Reject confirmation dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [userToReject, setUserToReject] = useState<User | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<"all" | "Pending" | "Rejected" | "Active">("all");

  // Check if current user is an admin
  const isAdmin = (): boolean => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin) return true;
    if (typeof currentUser.role === 'string') {
      return currentUser.role === 'ADMIN';
    }
    return currentUser.role === 2 || currentUser.role === 3;
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchDashboardStats();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchDashboardStats = async () => {
    setStatsLoading(true);
    try {
      const data = await DashboardService.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const columns: Column[] = [
    // {
    //   key: "_id",
    //   label: "User ID",
    // },
    {
      key: "firstName",
      label: "First Name",
      render: (value: string) => (
        <span title={value}>{truncateText(value)}</span>
      ),
    },
    {
      key: "lastName",
      label: "Last Name",
      render: (value: string) => (
        <span title={value}>{truncateText(value)}</span>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (value: string) => (
        <span title={value}>{truncateText(value)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value: "Archived" | "Active" | "Pending" | "Rejected") => {
        const statusConfig: {
          [key: string]: {
            label: string;
            className: string;
          };
        } = {
          Pending: {
            label: "Pending",
            className:
              "border-gray-500 text-foreground-500 bg-gray-50 hover:bg-gray-100",
          },
          Active: {
            label: "Active",
            className:
              "border-green-500 text-green-700 app-bg-surface hover:bg-green-100",
          },
          Archived: {
            label: "Archived",
            className:
              "border-orange-500 text-orange-700 app-bg-surface hover:bg-orange-100",
          },
          Rejected: {
            label: "Rejected",
            className:
              "border-red-500 text-red-700 bg-red-50 hover:bg-red-100",
          },
        };
        const config = statusConfig[value] || statusConfig["Pending"];
        return (
          <span
            className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium border min-w-[80px] ${config.className}`}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: "Created At",
      render: (value: string | Date) => {
        if (!value) return "N/A";
        try {
          const date = new Date(value);
          // Check if date is valid
          if (isNaN(date.getTime())) return "Invalid Date";
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch (error) {
          return "Invalid Date";
        }
      },
    },
    {
      key: "access",
      label: "Access",
      render: (_, row: User) => (
        <div className="flex items-center gap-1">
          {row.appAccess && (
            <span title="Mobile App Access" className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-600">
              <Smartphone className="w-3.5 h-3.5" />
            </span>
          )}
          {row.webAccess && (
            <span title="Web Dashboard Access" className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100 text-green-600">
              <Monitor className="w-3.5 h-3.5" />
            </span>
          )}
          {!row.appAccess && !row.webAccess && (
            <span className="text-xs text-gray-400">None</span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row: User) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleRowClick(row);
            }}
          >
            View Details
          </Button>
        </div>
      ),
    },
  ];
  // Columns for invites table
  const inviteColumns: Column[] = [
    {
      key: "email",
      label: "Email",
      render: (value: string) => (
        <span title={value}>{truncateText(value)}</span>
      ),
    },
    {
      key: "badgeId",
      label: "Badge ID",
      render: (value: string) => (
        <span className="font-mono text-sm">{value}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value: string) => {
        const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
          pending: { label: "Pending", variant: "outline" },
          badge_verified: { label: "Badge Verified", variant: "secondary" },
          registered: { label: "Registered", variant: "default" },
          approved: { label: "Approved", variant: "default" },
          rejected: { label: "Rejected", variant: "destructive" },
          revoked: { label: "Revoked", variant: "destructive" },
          archived: { label: "Archived", variant: "secondary" },
        };
        const config = statusConfig[value] || { label: value, variant: "outline" };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: "invitedByName",
      label: "Invited By",
      render: (value: string) => value || "System",
    },
    {
      key: "access",
      label: "Access",
      render: (_, row: AdminInvite) => (
        <div className="flex items-center gap-1">
          {row.appAccess && (
            <span title="Mobile App Access" className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-600">
              <Smartphone className="w-3.5 h-3.5" />
            </span>
          )}
          {row.webAccess && (
            <span title="Web Dashboard Access" className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100 text-green-600">
              <Monitor className="w-3.5 h-3.5" />
            </span>
          )}
          {!row.appAccess && !row.webAccess && (
            <span className="text-xs text-gray-400">None</span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Invited On",
      render: (value: string | Date) => {
        if (!value) return "N/A";
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) return "Invalid Date";
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch (error) {
          return "Invalid Date";
        }
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row: AdminInvite) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Edit - only for pending/badge_verified */}
            {['pending', 'badge_verified'].includes(row.status) && (
              <DropdownMenuItem onClick={() => handleEditInvite(row)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {/* Resend - only for pending */}
            {row.status === 'pending' && (
              <DropdownMenuItem onClick={() => handleResendInvite(row._id)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Resend Email
              </DropdownMenuItem>
            )}
            {/* Revoke - only for pending/badge_verified */}
            {['pending', 'badge_verified'].includes(row.status) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleRevokeInvite(row._id)}
                  className="text-orange-600"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Revoke
                </DropdownMenuItem>
              </>
            )}
            {/* Archive - for any status except archived */}
            {row.status !== 'archived' && (
              <DropdownMenuItem onClick={() => handleArchiveInvite(row._id)}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {/* Delete - always available */}
            <DropdownMenuItem 
              onClick={() => handleDeleteInvite(row._id)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Invite action handlers
  const handleEditInvite = (invite: AdminInvite) => {
    setSelectedInvite(invite);
    setEditFormData({
      badgeId: invite.badgeId,
      email: invite.email,
      personalMessage: invite.personalMessage || "",
    });
    setEditInviteModalOpen(true);
  };

  const handleSaveEditInvite = async () => {
    if (!selectedInvite) return;
    setEditLoading(true);
    try {
      await AdminInviteService.updateInvite(selectedInvite._id, editFormData);
      toast.success("Invitation updated successfully");
      setEditInviteModalOpen(false);
      fetchInvites();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update invitation");
    } finally {
      setEditLoading(false);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    try {
      await AdminInviteService.resendInvite(inviteId);
      toast.success("Invitation email resent");
      fetchInvites();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to resend invitation");
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation? The agent will no longer be able to register.")) return;
    try {
      await AdminInviteService.revokeInvite(inviteId);
      toast.success("Invitation revoked");
      fetchInvites();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to revoke invitation");
    }
  };

  const handleArchiveInvite = async (inviteId: string) => {
    try {
      await AdminInviteService.archiveInvite(inviteId);
      toast.success("Invitation archived");
      fetchInvites();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to archive invitation");
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!confirm("Are you sure you want to permanently delete this invitation? This action cannot be undone.")) return;
    try {
      await AdminInviteService.deleteInvite(inviteId);
      toast.success("Invitation deleted");
      fetchInvites();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete invitation");
    }
  };

  // Fetch invites
  const fetchInvites = async () => {
    if (!isAdmin()) return;
    setInvitesLoading(true);
    try {
      const response = await AdminInviteService.getAllInvites();
      setInvites(response.invites || []);
    } catch (error) {
      console.error("Error fetching invites:", error);
      toast.error("Failed to fetch invites");
    } finally {
      setInvitesLoading(false);
    }
  };

  // Fetch invites when switching to invites view
  useEffect(() => {
    if (viewMode === "invites" && isAdmin()) {
      fetchInvites();
    }
  }, [viewMode, currentUser]);
  const handleRowClick = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleApprove = async (user: User) => {
    if (!user._id) {
      toast.error("User ID is missing");
      return;
    }

    try {
      await UserPageService.approveUser(user._id);
      toast.success(
        `${user.firstName} ${user.lastName}'s account has been approved!`
      );
      setIsModalOpen(false);
      // Refresh the user list
      await fetchPage(currentPage);
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("Failed to approve user. Please try again.");
    }
  };

  const handleReject = async (user: User) => {
    // Show confirmation dialog instead of rejecting directly
    setUserToReject(user);
    setRejectionReason(""); // Reset reason
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!userToReject?._id) {
      toast.error("User ID is missing");
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setRejectLoading(true);
    try {
      await UserPageService.rejectUser(userToReject._id, rejectionReason.trim());
      toast.success(
        `${userToReject.firstName} ${userToReject.lastName}'s account has been rejected.`
      );
      setRejectDialogOpen(false);
      setUserToReject(null);
      setRejectionReason("");
      setIsModalOpen(false);
      // Refresh the user list
      await fetchPage(currentPage);
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast.error("Failed to reject user. Please try again.");
    } finally {
      setRejectLoading(false);
    }
  };

  const onSearch = (query: string) => {
    setSearch(query);
  };
  // Server-driven pagination state
  const [loading, setLoading] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<any | null>(null);

  // Helper to determine if parent passed a paginated payload
  const isPaginatedPayload = (
    u: any
  ): u is { data: User[]; pagination?: any } =>
    u &&
    typeof u === "object" &&
    !Array.isArray(u) &&
    (Array.isArray(u.data) || typeof u.pagination !== "undefined");

  // Prefer local fetched users first, then parent paginated payload, then legacy parent array
  const usersArray: User[] = (() => {
    let allUsers: User[] = [];

    if (users && users.length > 0) {
      allUsers = users;
    } else if (isPaginatedPayload(props.users)) {
      allUsers = props.users.data || [];
    } else if (Array.isArray(props.users)) {
      allUsers = props.users as User[];
    }

    return allUsers;
  })();

  // Filter users by status
  const filteredUsers = usersArray.filter((user) => {
    if (statusFilter === "all") return true;
    return user.status === statusFilter;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let av = "";
    let bv = "";
    if (sortKey === "lastName") {
      av = (a.lastName || "").toLowerCase();
      bv = (b.lastName || "").toLowerCase();
    } else if (sortKey === "email") {
      av = (a.email || "").toLowerCase();
      bv = (b.email || "").toLowerCase();
    } else if (sortKey === "status") {
      av = (a.status || "").toLowerCase();
      bv = (b.status || "").toLowerCase();
    }
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });

  const totalItems = (() => {
    if (pagination?.total_items != null) return pagination.total_items;
    if (isPaginatedPayload(props.users))
      return (
        props.users.pagination?.total_items ?? props.users.data.length ?? 0
      );
    return usersArray.length ?? 0;
  })();

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const paginatedDisplayData = sortedUsers;

  // Fetch a page from server
  const fetchPage = async (page: number) => {
    setLoading(true);
    try {
      const resp = await DashboardService.getUsersPage(page, pageSize);
      // debug: log server response to help diagnose empty pages
      // eslint-disable-next-line no-console
      console.debug("Dashboard.fetchPage response:", resp);
      setUsers(resp.data || []);
      setPagination(resp.pagination || null);
      setCurrentPage(Number(resp.pagination?.current_page) || page);
    } catch (err) {
      console.error("Failed to fetch users page:", err);
    } finally {
      setLoading(false);
    }
  };

  // On mount, fetch the first page unless parent already supplied paginated payload
  useEffect(() => {
    if (isPaginatedPayload(props.users) && props.users.pagination) {
      const p = Number(props.users.pagination.current_page) || 1;
      setCurrentPage(p);
      setUsers(props.users.data || []);
      setPagination(props.users.pagination || null);
      return;
    }

    if (isPaginatedPayload(props.users)) {
      setUsers(props.users.data || []);
      setPagination(props.users.pagination || null);
      setCurrentPage(Number(props.users.pagination?.current_page) || 1);
      return;
    }

    // No paginated payload from parent: fetch the first page from server
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.users]);

  // Single-sidebar layout: render page content directly (global layout provides sidebar)
  return (
    <>
      <PageContainer
        className="overflow-hidden relative"
        title="Dashboard"
        description="Overview of system statistics and user management"
      >
        {/* Statistics Cards: rectangle for Total Users, smaller squares for others on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Total Users (full-width rectangle on mobile) */}
          <Card className="col-span-2 md:col-span-1 h-28 sm:h-auto shadow-lg border-transparent">
            <CardContent className="p-4 sm:p-6 h-full flex flex-col justify-center">
              <div className="flex items-start justify-between">
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-medium app-text-subtle">
                    Total Users
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold app-text mt-1 sm:mt-2">
                    {statsLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      stats?.totalUsers || 0
                    )}
                  </p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 app-bg-primary-soft rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 app-text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Products (compact square) */}
          <Card className="h-28 sm:h-auto shadow-lg border-transparent flex flex-col">
            <CardContent className="p-3 sm:p-6 flex-1 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-medium app-text-subtle">
                    Total Products
                  </p>
                  <p className="text-xl sm:text-3xl font-bold app-text mt-1 sm:mt-2">
                    {statsLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      stats?.totalProducts || 0
                    )}
                  </p>
                </div>
                <div className="h-9 w-9 sm:h-12 sm:w-12 app-bg-primary-soft rounded-lg flex items-center justify-center">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 app-text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Companies (compact square) */}
          <Card className="h-28 sm:h-auto shadow-lg border-transparent flex flex-col">
            <CardContent className="p-3 sm:p-6 flex-1 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-medium app-text-subtle">
                    Total Companies
                  </p>
                  <p className="text-xl sm:text-3xl font-bold app-text mt-1 sm:mt-2">
                    {statsLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      stats?.totalCompanies || 0
                    )}
                  </p>
                </div>
                <div className="h-9 w-9 sm:h-12 sm:w-12 app-bg-primary-soft rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 app-text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle (Admin only) */}
        {isAdmin() && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === "users" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("users")}
                className="rounded-r-none cursor-pointer"
              >
                <Users className="h-4 w-4 mr-2" />
                Users
              </Button>
              <Button
                variant={viewMode === "invites" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("invites")}
                className="rounded-l-none cursor-pointer"
              >
                <Mail className="h-4 w-4 mr-2" />
                Invites
              </Button>
            </div>
          </div>
        )}

        {/* Users Table */}
        {viewMode === "users" && (
        <div className="w-full">
          <DataTable
            title="User Accounts"
            columns={columns}
            data={paginatedDisplayData}
            searchPlaceholder="Search users..."
            onSearch={(query) => onSearch(query)}
            loading={loading}
            emptyStateTitle="No Users Found"
            emptyStateDescription="You may try to input different keywords, check for typos, or adjust your filters."
            customControls={
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {isAdmin() && (
                  <Button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Agent
                  </Button>
                )}
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as "all" | "Pending" | "Rejected" | "Active")
                  }
                >
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Filter status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Status Filter</SelectLabel>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Select
                  value={sortKey}
                  onValueChange={(value) =>
                    setSortKey(value as "lastName" | "email" | "status")
                  }
                >
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Sort Options</SelectLabel>
                      <SelectItem value="lastName">Name (A→Z)</SelectItem>
                      <SelectItem value="email">Email (A→Z)</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            }
          />
        <div className="mt-4 flex items-center justify-between w-full">
          <div className="text-sm text-muted-foreground">
            Showing {paginatedDisplayData.length} of {statusFilter === "all" ? totalItems : filteredUsers.length} users
            {statusFilter !== "all" && ` (filtered by ${statusFilter})`} • Page{" "}
            {currentPage} of {totalPages}
          </div>

          <Pagination className="mx-0 w-auto">
            <PaginationContent className="gap-1">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => currentPage > 1 && fetchPage(currentPage - 1)}
                  className={
                    currentPage <= 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {currentPage > 2 && (
                <PaginationItem>
                  <PaginationLink
                    onClick={() => fetchPage(1)}
                    className="cursor-pointer"
                  >
                    1
                  </PaginationLink>
                </PaginationItem>
              )}

              {currentPage > 3 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationLink
                    onClick={() => fetchPage(currentPage - 1)}
                    className="cursor-pointer"
                  >
                    {currentPage - 1}
                  </PaginationLink>
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationLink isActive className="cursor-pointer">
                  {currentPage}
                </PaginationLink>
              </PaginationItem>

              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationLink
                    onClick={() => fetchPage(currentPage + 1)}
                    className="cursor-pointer"
                  >
                    {currentPage + 1}
                  </PaginationLink>
                </PaginationItem>
              )}

              {currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {currentPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationLink
                    onClick={() => fetchPage(totalPages)}
                    className="cursor-pointer"
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    currentPage < totalPages && fetchPage(currentPage + 1)
                  }
                  className={
                    currentPage >= totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
        </div>
        )}

        {/* Invites Table (Admin only) */}
        {viewMode === "invites" && isAdmin() && (
          <div className="w-full">
            <DataTable
              title="Agent Invitations"
              columns={inviteColumns}
              data={invites}
              searchPlaceholder="Search invites..."
              onSearch={() => {}}
              loading={invitesLoading}
              emptyStateTitle="No Invites Found"
              emptyStateDescription="No agent invitations have been sent yet."
              customControls={
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Agent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchInvites}
                    disabled={invitesLoading}
                  >
                    Refresh
                  </Button>
                </div>
              }
            />
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {invites.length} invitations
            </div>
          </div>
        )}
      </PageContainer>

      {/* User Detail Modal */}
      <UserDetailModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onApprove={handleApprove}
        onReject={handleReject}
        onAccessUpdate={(updatedUser) => {
          // Update the selected user and refresh the list
          setSelectedUser(updatedUser);
          fetchPage(currentPage);
        }}
      />

      {/* Invite Agent Modal */}
      <AddAgentModal
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        onSuccess={() => {
          fetchPage(currentPage);
          if (viewMode === "invites") fetchInvites();
        }}
      />

      {/* Edit Invite Modal */}
      <Dialog open={editInviteModalOpen} onOpenChange={setEditInviteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-green-600" />
              Edit Invitation
            </DialogTitle>
            <DialogDescription>
              Update the invitation details. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                disabled={editLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-badgeId">Badge ID</Label>
              <Input
                id="edit-badgeId"
                value={editFormData.badgeId}
                onChange={(e) => setEditFormData({ ...editFormData, badgeId: e.target.value.toUpperCase() })}
                disabled={editLoading}
              />
              <p className="text-xs text-muted-foreground">
                The agent must enter this exact badge ID to verify their identity.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-message">Personal Message (Optional)</Label>
              <Input
                id="edit-message"
                value={editFormData.personalMessage}
                onChange={(e) => setEditFormData({ ...editFormData, personalMessage: e.target.value })}
                disabled={editLoading}
                placeholder="Add a personal message..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditInviteModalOpen(false)}
              disabled={editLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditInvite}
              disabled={editLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {editLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={(open) => {
        setRejectDialogOpen(open);
        if (!open) {
          setUserToReject(null);
          setRejectionReason("");
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Reject User Account
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this user's account. The user will be notified.
            </DialogDescription>
          </DialogHeader>
          {userToReject && (
            <div className="py-4 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>User:</strong> {userToReject.firstName} {userToReject.lastName}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Email:</strong> {userToReject.email}
                </p>
                {userToReject.badgeId && (
                  <p className="text-sm text-gray-700">
                    <strong>Badge ID:</strong> {userToReject.badgeId}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejection-reason" className="text-sm font-medium">
                  Rejection Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Please explain why this account is being rejected (e.g., invalid documents, incomplete information, etc.)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  disabled={rejectLoading}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This message will be stored and can be viewed in the user's account details.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setUserToReject(null);
                setRejectionReason("");
              }}
              disabled={rejectLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmReject}
              disabled={rejectLoading || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {rejectLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
