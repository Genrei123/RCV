import {
  User,
  Mail,
  MapPin,
  Calendar,
  Phone,
  Badge as BadgeIcon,
  Archive,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import ExcelJS from "exceljs";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { PageContainer } from "@/components/PageContainer";
import { EditProfileModal } from "@/components/EditProfileModal";
import { ArchiveAccountModal } from "@/components/ArchiveAccountModal";
import { useEffect, useMemo, useState } from "react";
import { UserPageService, type UserProfile } from "@/services/userPageService";
import { AuditLogService, type AuditLog } from "@/services/auditLogService";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AuthService } from "@/services/authService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Avatar editing is handled in EditProfileModal; Profile view is read-only.

export interface ProfileUser {
  _id?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  name?: string; // For backward compatibility with mock data
  role?: string | number;
  avatar?: string;
  email: string;
  location?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  badgeId?: string;
  stationedAt?: string;
}

interface ProfileProps {
  user?: ProfileUser;
  loading?: boolean;
}

export function Profile({
  user: propUser,
  loading: propLoading = false,
}: ProfileProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<ProfileUser | null>(propUser || null);
  const [loading, setLoading] = useState(propLoading);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  // Avatar local state
  // Avatar local state for display only (view mode)
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  // Removed cropOpen, cropImageSrc, and fileInputRef for view-only mode

  // Full audit logs fetched once for consistent cross-page sorting
  const [fullAuditLogs, setFullAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPagination, setLogsPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_pages: 1,
    total_items: 0,
  });
  const [sortBy, setSortBy] = useState<"all" | "platform" | "action">("all");

  const sortedFullLogs = useMemo(() => {
    const arr = [...fullAuditLogs];
    if (sortBy === "platform") {
      const order: Record<string, number> = { MOBILE: 0, WEB: 1 };
      return arr.sort((a, b) => {
        const pa = order[a.platform] ?? 99;
        const pb = order[b.platform] ?? 99;
        if (pa === pb) {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        return pa - pb; // MOBILE first, then WEB
      });
    }
    if (sortBy === "action") {
      return arr.sort((a, b) => a.action.localeCompare(b.action));
    }
    return arr;
  }, [fullAuditLogs, sortBy]);

  const currentPageLogs = useMemo(() => {
    const start = (logsPagination.current_page - 1) * logsPagination.per_page;
    return sortedFullLogs.slice(start, start + logsPagination.per_page);
  }, [sortedFullLogs, logsPagination.current_page, logsPagination.per_page]);

  // Fetch profile data on mount
  useEffect(() => {
    if (!propUser) {
      fetchProfile();
    } else {
      setUser(propUser);
    }
    fetchAllAuditLogs();
    // Load avatar from localStorage override if present (view-only on Profile page)
    try {
      const saved = localStorage.getItem("profile_avatar_data");
      if (saved) setLocalAvatar(saved);
    } catch (e) {
      // noop
    }

    // Listen for avatar updates from EditProfileModal
    const handleAvatarUpdate = () => {
      try {
        const saved = localStorage.getItem("profile_avatar_data");
        if (saved) {
          console.log("🔄 Avatar updated, refreshing preview");
          setLocalAvatar(saved);
        }
      } catch (e) {
        console.error("Error updating avatar preview:", e);
      }
    };

    window.addEventListener("profile-avatar-updated", handleAvatarUpdate);

    return () => {
      window.removeEventListener("profile-avatar-updated", handleAvatarUpdate);
    };
  }, [propUser]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await UserPageService.getProfile();
      if (data.profile) {
        setUser(data.profile);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAuditLogs = async () => {
    setLogsLoading(true);
    try {
      console.log("Fetching all audit logs for consistent pagination");
      const first = await AuditLogService.getMyLogs(1, logsPagination.per_page);
      if (!first || !first.pagination) throw new Error("Invalid response");
      let all: AuditLog[] = [...(first.data || [])];
      const totalPages = first.pagination.total_pages || 1;
      for (let p = 2; p <= totalPages; p++) {
        const resp = await AuditLogService.getMyLogs(
          p,
          first.pagination.per_page
        );
        all = all.concat(resp.data || []);
      }
      setFullAuditLogs(all);
      setLogsPagination({
        current_page: 1,
        per_page: first.pagination.per_page,
        total_pages: first.pagination.total_pages,
        total_items: first.pagination.total_items,
      });
    } catch (error: any) {
      console.error("Error fetching all audit logs:", error);
      if (
        error.code === "ERR_NETWORK" ||
        error.message?.includes("Network Error")
      ) {
        toast.error(
          "Cannot connect to server. Please make sure the backend is running."
        );
      } else if (error.response?.status === 401) {
        toast.error("Authentication failed. Please login again.");
      } else {
        toast.error(
          "Failed to load activity logs: " +
            (error.response?.data?.message || error.message)
        );
      }
    } finally {
      setLogsLoading(false);
    }
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  // Validation helpers
  const validateEmail = (email?: string) => {
    if (!email) return false;
    // simple RFC-like regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateName = (name?: string) => {
    if (!name) return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 50;
  };

  const validatePhone = (phone?: string) => {
    if (!phone) return true; // optional
    // allow digits, spaces, +, -, ()
    return /^[\d\s+\-().]{6,20}$/.test(phone);
  };

  const validateBadgeId = (badge?: string) => {
    if (!badge) return true; // optional
    return /^[a-zA-Z0-9\-_.]{2,30}$/.test(badge);
  };

  const validateDOB = (dob?: string) => {
    if (!dob) return true;
    const d = new Date(dob);
    return !isNaN(d.getTime());
  };

  const handleSaveProfile = async (updatedUser: Partial<ProfileUser>) => {
    // client-side validations
    // Required name fields
    if (!validateName(updatedUser.firstName)) {
      toast.error("First name is required (2-50 characters).");
      return;
    }
    if (!validateName(updatedUser.lastName)) {
      toast.error("Last name is required (2-50 characters).");
      return;
    }
    // Email
    if (!validateEmail(updatedUser.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    // Phone (optional)
    if (!validatePhone(updatedUser.phoneNumber)) {
      toast.error("Please enter a valid phone number (6-20 digits).");
      return;
    }
    // Badge ID (optional)
    if (!validateBadgeId(updatedUser.badgeId)) {
      toast.error(
        "Badge ID may only contain letters, numbers, - _ . and be 2-30 chars."
      );
      return;
    }
    // Date of birth (optional)
    if (!validateDOB(updatedUser.dateOfBirth)) {
      toast.error("Date of birth is invalid.");
      return;
    }

    try {
      // Convert ProfileUser to UserProfile format
      const profileData: Partial<UserProfile> = {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        middleName: updatedUser.middleName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        dateOfBirth: updatedUser.dateOfBirth,
        location: updatedUser.location,
        badgeId: updatedUser.badgeId,
      };

      // Add avatar if it's a Firebase Storage URL (not base64)
      if (updatedUser.avatar && updatedUser.avatar.startsWith("http")) {
        profileData.avatar = updatedUser.avatar;
        console.log("💾 Saving Firebase Storage URL:", updatedUser.avatar);
      }

      console.log("💾 Saving profile with data:", profileData);
      await UserPageService.updateProfile(profileData);

      toast.success("Profile updated successfully!");

      // Refresh profile data to get the updated avatar URL from backend
      await fetchProfile();

      // Also update local avatar preview from localStorage
      try {
        const saved = localStorage.getItem("profile_avatar_data");
        if (saved) {
          console.log("🔄 Updating local avatar preview");
          setLocalAvatar(saved);
        }
      } catch (e) {
        console.error("Error updating local avatar:", e);
      }

      // Refresh audit logs to show the profile update action
      await fetchAllAuditLogs();

      setShowEditModal(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleArchiveAccount = () => {
    setShowArchiveModal(true);
  };

  const handleConfirmArchive = async () => {
    try {
      await UserPageService.archiveAccount();
      toast.success("Account archived. Logging out...");
      setShowArchiveModal(false);
      // Logout and redirect
      await AuthService.logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to archive account:", error);
      toast.error("Failed to archive account");
    }
  };

  // Helper function to get role name
  const getRoleName = (role?: string | number): string => {
    if (typeof role === "string") return role;
    const roleMap: { [key: number]: string } = {
      1: "Agent",
      2: "Admin",
      3: "Super Admin",
    };
    return roleMap[role || 1] || "User";
  };

  // Helper function to get full name
  const getFullName = (userData: ProfileUser | null): string => {
    if (!userData) return "User";
    if (userData.name) return userData.name;
    const parts = [
      userData.firstName,
      userData.middleName,
      userData.lastName,
    ].filter(Boolean);
    return parts.join(" ") || "User";
  };

  // Avatar handlers
  // Note: Editing avatar is handled inside the Edit Profile modal. Profile page avatar is view-only.

  // Activity table columns for audit logs
  const activityColumns: Column[] = [
    {
      key: "action",
      label: "Action",
      render: (value) => {
        if (typeof value !== "string") {
          return (
            <span className="font-medium text-neutral-900">
              {String(value)}
            </span>
          );
        }
        const MAX_LEN = 40;
        const truncated =
          value.length > MAX_LEN ? value.slice(0, MAX_LEN) + "…" : value;
        return (
          <span
            className="font-medium text-neutral-900"
            title={value} // native tooltip shows full action
            data-full-action={value}
          >
            {truncated}
          </span>
        );
      },
    },
    {
      key: "platform",
      label: "Platform",
      render: (value: string) => {
        const icon = value === "WEB" ? "" : ""; // blank lang since tanggal emoji
        return (
          <span className="text-sm text-neutral-600">
            {icon} {value}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: "Date & Time",
      render: (value: string) => {
        if (!value) return "N/A";
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) return "Invalid Date";

          const dateStr = date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          const timeStr = date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-neutral-900">
                {dateStr}
              </span>
              <span className="text-xs text-neutral-500">{timeStr}</span>
            </div>
          );
        } catch (error) {
          return "Invalid Date";
        }
      },
    },
    {
      key: "_id",
      label: "Actions",
      render: (_value: string, row: any) => {
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(row as AuditLog)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            View Details
          </Button>
        );
      },
    },
  ];

  const handleViewDetails = async (log: AuditLog) => {
    try {
      setSelectedLog(log);
      setShowDetailsModal(true);
    } catch (error) {
      console.error("Error opening details:", error);
      toast.error("Failed to load log details");
    }
  };

  if (loading) {
    return (
      <PageContainer
        title="Profile"
        description="Manage your personal account information and activity"
      >
        <div className="animate-pulse py-6 md:py-8 space-y-6">
          <div className="h-8 bg-neutral-200 rounded w-48 mb-6"></div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="h-96 bg-neutral-200 rounded-lg"></div>
            <div className="h-96 bg-neutral-200 rounded-lg"></div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Profile"
      description="Manage your personal account information and activity"
      headerAction={
        <div className="flex items-center gap-3 cursor-pointer">
          <Button
            onClick={handleEditProfile}
            className="bg-teal-600 hover:bg-primary-700 text-white w-auto cursor-pointer"
          >
            Edit Profile
          </Button>
          <Button
            onClick={handleArchiveAccount}
            variant="destructive"
            className="bg-amber-500 hover:bg-error-700 text-white w-auto cursor-pointer"
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive Account
          </Button>
        </div>
      }
    >
      <div className="grid w-full grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {/* Profile Information */}
        <Card className="w-full">
          <CardContent className="p-4 sm:p-6 w-full">
            <div className="mb-12">
              <h2 className="text-xl font-semibold text-neutral-900 mb-1">
                Profile Information
              </h2>
              <p className="text-sm text-neutral-600">
                Update your personal account
              </p>
            </div>

            {/* Avatar Section */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className="w-30 h-30 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                  {localAvatar ? (
                    <img
                      src={localAvatar}
                      alt={getFullName(user)}
                      className="w-full h-full object-cover"
                    />
                  ) : user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={getFullName(user)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-neutral-500" />
                  )}
                  {/* View-only avatar: no overlay or edit icon */}
                </div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  {getFullName(user)}
                </h3>
                <p className="text-sm text-neutral-600">
                  {getRoleName(user?.role)}
                </p>
              </div>
            </div>

            {/* Profile Details */}
            <div className="space-y-4 w-full">
              <div className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg w-full">
                <Mail className="w-5 h-5 text-neutral-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">Email</p>
                  <p className="text-sm text-neutral-600 break-all">
                    {user?.email || "Not provided"}
                  </p>
                </div>
              </div>

              {user?.location && (
                <div className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg w-full">
                  <MapPin className="w-5 h-5 text-neutral-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      Location
                    </p>
                    <p className="text-sm text-neutral-600 break-words">
                      {user.location}
                    </p>
                  </div>
                </div>
              )}

              {user?.dateOfBirth && (
                <div className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg w-full">
                  <Calendar className="w-5 h-5 text-neutral-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      Date of Birth
                    </p>
                    <p className="text-sm text-neutral-600">
                      {user.dateOfBirth}
                    </p>
                  </div>
                </div>
              )}

              {user?.phoneNumber && (
                <div className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg w-full">
                  <Phone className="w-5 h-5 text-neutral-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      Phone Number
                    </p>
                    <p className="text-sm text-neutral-600 break-all">
                      {user.phoneNumber}
                    </p>
                  </div>
                </div>
              )}

              {user?.badgeId && (
                <div className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg w-full">
                  <BadgeIcon className="w-5 h-5 text-neutral-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      Badge ID
                    </p>
                    <p className="text-sm text-neutral-600 break-all">
                      {user.badgeId}
                    </p>
                  </div>
                </div>
              )}

              {user?.stationedAt && (
                <div className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg w-full">
                  <BadgeIcon className="w-5 h-5 text-neutral-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      Stationed At
                    </p>
                    <p className="text-sm text-neutral-600 break-words">
                      {user.stationedAt}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="w-full">
          <CardContent className="p-4 sm:p-6 w-full">
            <div className="mb-4 w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-xl font-semibold text-neutral-900">
                Your Recent Activities
              </h2>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="activity-sort"
                  className="text-sm text-neutral-600 hidden sm:blockcursor-pointer"
                >
                  Sort:
                </label>
                <select
                  id="activity-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm cursor-pointer "
                >
                  <option value="all">All (default)</option>
                  <option value="action">Action (A–Z)</option>
                </select>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const progressDelay = 800; // Show progress alert only if export takes longer than 800ms
                      let progressToastId: string | number | null = null;

                      // Set a timer to show progress alert if export is taking too long
                      const progressTimer = setTimeout(() => {
                        progressToastId = toast.info("Preparing Excel export…");
                      }, progressDelay);

                      const all = [...sortedFullLogs];

                      // Create workbook and worksheet with exceljs
                      const workbook = new ExcelJS.Workbook();
                      const worksheet = workbook.addWorksheet("Activities");

                      // Define columns
                      worksheet.columns = [
                        { header: "Date", key: "date", width: 22 },
                        { header: "Action", key: "action", width: 38 },
                        { header: "Type", key: "type", width: 18 },
                        { header: "Platform", key: "platform", width: 12 },
                        { header: "IP", key: "ip", width: 18 },
                        { header: "User Agent", key: "userAgent", width: 55 },
                        { header: "Log ID", key: "logId", width: 38 },
                      ];

                      // Add data rows
                      all.forEach((l) => {
                        worksheet.addRow({
                          date: new Date(l.createdAt).toLocaleString(),
                          action: (l.action || "").replace(/\n|\r/g, " "),
                          type: l.actionType || "",
                          platform: l.platform || "",
                          ip: l.ipAddress || "",
                          userAgent: (l.userAgent || "").replace(/\n|\r/g, " "),
                          logId: l._id,
                        });
                      });

                      // Style header row (A1:G1)
                      const headerRow = worksheet.getRow(1);
                      headerRow.height = 28;
                      headerRow.eachCell((cell) => {
                        cell.fill = {
                          type: "pattern",
                          pattern: "solid",
                          fgColor: { argb: "FF005440" }, // #005440
                        };
                        cell.font = {
                          bold: true,
                          size: 11,
                          color: { argb: "FFFFFFFF" }, // white
                        };
                        cell.alignment = {
                          vertical: "middle",
                          horizontal: "left",
                          wrapText: true,
                        };
                        cell.border = {
                          top: { style: "thin", color: { argb: "FF005440" } },
                          bottom: {
                            style: "thin",
                            color: { argb: "FF005440" },
                          },
                          left: { style: "thin", color: { argb: "FF005440" } },
                          right: { style: "thin", color: { argb: "FF005440" } },
                        };
                      });

                      // Freeze header row
                      worksheet.views = [
                        { state: "frozen", ySplit: 1, xSplit: 0 },
                      ];

                      // Auto filter
                      worksheet.autoFilter = {
                        from: "A1",
                        to: `G${all.length + 1}`,
                      };

                      // Generate file and download
                      const buffer = await workbook.xlsx.writeBuffer();
                      const blob = new Blob([buffer], {
                        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `rcv-activities-${new Date()
                        .toISOString()
                        .slice(0, 10)}.xlsx`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);

                      // Clear the progress timer since export completed
                      clearTimeout(progressTimer);

                      // Dismiss progress toast if it was shown
                      if (progressToastId !== null) {
                        toast.dismiss(progressToastId);
                      }

                      toast.success("Excel exported");
                    } catch (err) {
                      console.error(err);
                      toast.error("Failed to export activities");
                    }
                  }}
                >
                  Export Excel
                </Button>
              </div>
            </div>

            {/* Activities Table */}
            <div className="mb-6 w-full ">
              <DataTable
                title=""
                columns={activityColumns}
                data={currentPageLogs}
                loading={logsLoading}
                emptyStateTitle="No Activities Found"
                emptyStateDescription="Your recent activities will appear here."
                showSearch={false}
              />
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground">
                Showing {currentPageLogs.length} of {logsPagination.total_items}{" "}
                activities • Page {logsPagination.current_page} of{" "}
                {logsPagination.total_pages}
              </div>

              <Pagination className="mx-0 w-auto">
                <PaginationContent className="gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        logsPagination.current_page > 1 &&
                        setLogsPagination((prev) => ({
                          ...prev,
                          current_page: prev.current_page - 1,
                        }))
                      }
                      className={
                        logsPagination.current_page <= 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {logsPagination.current_page > 2 && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() =>
                          setLogsPagination((prev) => ({
                            ...prev,
                            current_page: 1,
                          }))
                        }
                        className="cursor-pointer"
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  {logsPagination.current_page > 3 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {logsPagination.current_page > 1 && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() =>
                          setLogsPagination((prev) => ({
                            ...prev,
                            current_page: prev.current_page - 1,
                          }))
                        }
                        className="cursor-pointer"
                      >
                        {logsPagination.current_page - 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationLink isActive className="cursor-pointer">
                      {logsPagination.current_page}
                    </PaginationLink>
                  </PaginationItem>

                  {logsPagination.current_page < logsPagination.total_pages && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() =>
                          setLogsPagination((prev) => ({
                            ...prev,
                            current_page: prev.current_page + 1,
                          }))
                        }
                        className="cursor-pointer"
                      >
                        {logsPagination.current_page + 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  {logsPagination.current_page <
                    logsPagination.total_pages - 2 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  {logsPagination.current_page <
                    logsPagination.total_pages - 1 && (
                    <PaginationItem>
                      <PaginationLink
                        onClick={() =>
                          setLogsPagination((prev) => ({
                            ...prev,
                            current_page: prev.total_pages,
                          }))
                        }
                        className="cursor-pointer"
                      >
                        {logsPagination.total_pages}
                      </PaginationLink>
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        logsPagination.current_page <
                          logsPagination.total_pages &&
                        setLogsPagination((prev) => ({
                          ...prev,
                          current_page: prev.current_page + 1,
                        }))
                      }
                      className={
                        logsPagination.current_page >=
                        logsPagination.total_pages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <EditProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={user}
        onSave={handleSaveProfile}
      />
      <ArchiveAccountModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        userEmail={user?.email || ""}
        onConfirm={handleConfirmArchive}
      />

      {/* Audit Log Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Action */}
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-neutral-500 mb-1">
                  Action
                </p>
                <p className="text-base font-semibold text-neutral-900">
                  {selectedLog.action}
                </p>
              </div>

              {/* Action Type */}
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-neutral-500 mb-1">
                  Type
                </p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    AuditLogService.getActionTypeBadge(selectedLog.actionType)
                      .className
                  }`}
                >
                  {
                    AuditLogService.getActionTypeBadge(selectedLog.actionType)
                      .label
                  }
                </span>
              </div>

              {/* Platform */}
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-neutral-500 mb-1">
                  Platform
                </p>
                <p className="text-base text-neutral-900">
                  {selectedLog.platform === "WEB" ? "Web" : "Mobile"}
                </p>
              </div>

              {/* Date & Time */}
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-neutral-500 mb-1">
                  Date & Time
                </p>
                <p className="text-base text-neutral-900">
                  {new Date(selectedLog.createdAt).toLocaleString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>

              {/* IP Address */}
              {selectedLog.ipAddress && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    IP Address
                  </p>
                  <p className="text-base text-neutral-900 font-mono">
                    {selectedLog.ipAddress}
                  </p>
                </div>
              )}

              {/* User Agent */}
              {selectedLog.userAgent && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    User Agent
                  </p>
                  <p className="text-sm text-neutral-700 break-words">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}

              {/* Location */}
              {selectedLog.location && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    Location
                  </p>
                  <div className="space-y-1">
                    {selectedLog.location.latitude &&
                      selectedLog.location.longitude && (
                        <p className="text-sm text-neutral-700">
                          Coordinates: {selectedLog.location.latitude},{" "}
                          {selectedLog.location.longitude}
                        </p>
                      )}
                    {selectedLog.location.address && (
                      <p className="text-sm text-neutral-700">
                        Address: {selectedLog.location.address}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Scan Images */}
              {selectedLog.metadata?.frontImageUrl ||
              selectedLog.metadata?.backImageUrl ? (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-3">
                    Scan Images
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {selectedLog.metadata.frontImageUrl && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-neutral-600">
                          Front Image
                        </p>
                        <a
                          href={selectedLog.metadata.frontImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block border rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={selectedLog.metadata.frontImageUrl}
                            alt="Front scan"
                            className="w-full h-48 object-cover"
                          />
                        </a>
                      </div>
                    )}
                    {selectedLog.metadata.backImageUrl && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-neutral-600">
                          Back Image
                        </p>
                        <a
                          href={selectedLog.metadata.backImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block border rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={selectedLog.metadata.backImageUrl}
                            alt="Back scan"
                            className="w-full h-48 object-cover"
                          />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* OCR Extracted Information */}
              {selectedLog.metadata?.extractedInfo && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-2">
                    OCR Extracted Information
                  </p>
                  <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                    {Object.entries(selectedLog.metadata.extractedInfo).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex justify-between items-start gap-3"
                        >
                          <span className="text-sm font-medium text-blue-700 capitalize">
                            {key.replace(/([A-Z])/g, " $1").trim()}:
                          </span>
                          <span className="text-sm text-neutral-900 text-right ml-4 font-medium break-words max-w-[60%]">
                            {value === undefined ||
                            value === null ||
                            value === ""
                              ? "N/A"
                              : typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* OCR Raw Text */}
              {selectedLog.metadata?.scannedText && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-2">
                    OCR Raw Text
                  </p>
                  <div className="bg-neutral-100 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <pre className="text-xs text-neutral-800 whitespace-pre-wrap font-mono">
                      {selectedLog.metadata.scannedText}
                    </pre>
                  </div>
                </div>
              )}

              {/* Scan Type & Status */}
              {(selectedLog.metadata?.scanType ||
                selectedLog.metadata?.extractionSuccess !== undefined) && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-2">
                    Scan Details
                  </p>
                  <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
                    {selectedLog.metadata.scanType && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-neutral-600">
                          Scan Type:
                        </span>
                        <span className="text-sm text-neutral-900 font-medium">
                          {selectedLog.metadata.scanType}
                        </span>
                      </div>
                    )}
                    {selectedLog.metadata.extractionSuccess !== undefined && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-neutral-600">
                          Extraction Status:
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            selectedLog.metadata.extractionSuccess
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {selectedLog.metadata.extractionSuccess
                            ? "Success"
                            : "Failed"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata &&
                Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="border-b pb-3">
                    <p className="text-sm font-medium text-neutral-500 mb-2">
                      Additional Information
                    </p>
                    <div className="bg-neutral-50 rounded-lg p-3 space-y-2">
                      {Object.entries(selectedLog.metadata)
                        .filter(
                          ([key]) =>
                            key !== "frontImageUrl" &&
                            key !== "backImageUrl" &&
                            key !== "extractedInfo" &&
                            key !== "scanType" &&
                            key !== "extractionSuccess" &&
                            key !== "scannedText"
                        )
                        .map(([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between items-start gap-3"
                          >
                            <span className="text-sm font-medium text-neutral-600 capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}:
                            </span>
                            <span className="text-sm text-neutral-900 text-right ml-4 break-words max-w-[60%]">
                              {typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

              {/* Target User */}
              {selectedLog.targetUser && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    Target User
                  </p>
                  <p className="text-base text-neutral-900">
                    {selectedLog.targetUser.firstName}{" "}
                    {selectedLog.targetUser.lastName}
                    <span className="text-sm text-neutral-500 ml-2">
                      ({selectedLog.targetUser.email})
                    </span>
                  </p>
                </div>
              )}

              {/* Log ID */}
              <div>
                <p className="text-sm font-medium text-neutral-500 mb-1">
                  Log ID
                </p>
                <p className="text-xs text-neutral-600 font-mono">
                  {selectedLog._id}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6 ">
            <Button
              variant="outline"
              onClick={() => setShowDetailsModal(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Avatar Crop Dialog */}
    </PageContainer>
  );
}
