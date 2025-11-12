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
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { PageContainer } from "@/components/PageContainer";
import { EditProfileModal } from "@/components/EditProfileModal";
import { ArchiveAccountModal } from "@/components/ArchiveAccountModal";
import { useEffect, useState } from "react";
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

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPagination, setLogsPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_pages: 1,
    total_items: 0,
  });

  // Fetch profile data on mount
  useEffect(() => {
    if (!propUser) {
      fetchProfile();
    } else {
      setUser(propUser);
    }
    fetchAuditLogs(1);
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
          console.log('🔄 Avatar updated, refreshing preview');
          setLocalAvatar(saved);
        }
      } catch (e) {
        console.error('Error updating avatar preview:', e);
      }
    };

    window.addEventListener('profile-avatar-updated', handleAvatarUpdate);

    return () => {
      window.removeEventListener('profile-avatar-updated', handleAvatarUpdate);
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

  const fetchAuditLogs = async (page: number = 1) => {
    setLogsLoading(true);
    try {
      console.log("Fetching audit logs for page:", page);
      const response = await AuditLogService.getMyLogs(page, 10);
      console.log("Audit logs response:", response);

      // Check if response has the expected structure
      if (!response) {
        throw new Error("No response from server");
      }

      setAuditLogs(response.data || []);
      if (response.pagination) {
        setLogsPagination(response.pagination);
      }
    } catch (error: any) {
      console.error("Error fetching audit logs:", error);
      console.error("Error details:", error.response?.data || error.message);

      // More specific error messages
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

  const handleSaveProfile = async (updatedUser: Partial<ProfileUser>) => {
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
      if (updatedUser.avatar && updatedUser.avatar.startsWith('http')) {
        profileData.avatar = updatedUser.avatar;
        console.log('💾 Saving Firebase Storage URL:', updatedUser.avatar);
      }

      console.log('💾 Saving profile with data:', profileData);
      await UserPageService.updateProfile(profileData);
      
      toast.success("Profile updated successfully!");
      
      // Refresh profile data to get the updated avatar URL from backend
      await fetchProfile();
      
      // Also update local avatar preview from localStorage
      try {
        const saved = localStorage.getItem("profile_avatar_data");
        if (saved) {
          console.log('🔄 Updating local avatar preview');
          setLocalAvatar(saved);
        }
      } catch (e) {
        console.error('Error updating local avatar:', e);
      }
      
      // Refresh audit logs to show the profile update action
      await fetchAuditLogs(logsPagination.current_page);
      
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
            <span className="font-medium text-gray-900">{String(value)}</span>
          );
        }
        const MAX_LEN = 40;
        const truncated =
          value.length > MAX_LEN ? value.slice(0, MAX_LEN) + "…" : value;
        return (
          <span
            className="font-medium text-gray-900"
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
          <span className="text-sm text-gray-600">
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
              <span className="text-sm font-medium text-gray-900">
                {dateStr}
              </span>
              <span className="text-xs text-gray-500">{timeStr}</span>
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
            className="flex items-center gap-2"
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
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-200 rounded-lg"></div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageContainer
      title="Profile"
      description="Manage your personal account information and activity"
      headerAction={
        <div className="flex gap-3">
          <Button
            onClick={handleEditProfile}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            Edit Profile
          </Button>
          <Button
            onClick={handleArchiveAccount}
            variant="destructive"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive Account
          </Button>
        </div>
      }
    >
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Profile Information */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Profile Information
              </h2>
              <p className="text-sm text-gray-600">
                Update your personal account
              </p>
            </div>

            {/* Avatar Section */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
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
                    <User className="w-12 h-12 text-gray-500" />
                  )}
                  {/* View-only avatar: no overlay or edit icon */}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {getFullName(user)}
                </h3>
                <p className="text-sm text-gray-600">
                  {getRoleName(user?.role)}
                </p>
              </div>
            </div>

            {/* Profile Details */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                <Mail className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">
                    {user?.email || "Not provided"}
                  </p>
                </div>
              </div>

              {user?.location && (
                <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Location
                    </p>
                    <p className="text-sm text-gray-600">{user.location}</p>
                  </div>
                </div>
              )}

              {user?.dateOfBirth && (
                <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Date of Birth
                    </p>
                    <p className="text-sm text-gray-600">{user.dateOfBirth}</p>
                  </div>
                </div>
              )}

              {user?.phoneNumber && (
                <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Phone Number
                    </p>
                    <p className="text-sm text-gray-600">{user.phoneNumber}</p>
                  </div>
                </div>
              )}

              {user?.badgeId && (
                <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <BadgeIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Badge ID
                    </p>
                    <p className="text-sm text-gray-600">{user.badgeId}</p>
                  </div>
                </div>
              )}

              {user?.stationedAt && (
                <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                  <BadgeIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Stationed At
                    </p>
                    <p className="text-sm text-gray-600">{user.stationedAt}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                Your Recent Activities
              </h2>
            </div>

            {/* Activities Table */}
            <div className="mb-6">
              <DataTable
                title=""
                columns={activityColumns}
                data={auditLogs}
                loading={logsLoading}
                emptyStateTitle="No Activities Found"
                emptyStateDescription="Your recent activities will appear here."
                showSearch={false}
              />
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={logsPagination.current_page}
              totalPages={logsPagination.total_pages}
              totalItems={logsPagination.total_items}
              itemsPerPage={logsPagination.per_page}
              onPageChange={(page) => fetchAuditLogs(page)}
              showingText={`Showing ${auditLogs.length} out of ${logsPagination.total_items} activities`}
            />
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
                <p className="text-sm font-medium text-gray-500 mb-1">Action</p>
                <p className="text-base font-semibold text-gray-900">
                  {selectedLog.action}
                </p>
              </div>

              {/* Action Type */}
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-gray-500 mb-1">Type</p>
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
                <p className="text-sm font-medium text-gray-500 mb-1">
                  Platform
                </p>
                <p className="text-base text-gray-900">
                  {selectedLog.platform === "WEB" ? "Web" : "Mobile"}
                </p>
              </div>

              {/* Date & Time */}
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-gray-500 mb-1">
                  Date & Time
                </p>
                <p className="text-base text-gray-900">
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
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    IP Address
                  </p>
                  <p className="text-base text-gray-900 font-mono">
                    {selectedLog.ipAddress}
                  </p>
                </div>
              )}

              {/* User Agent */}
              {selectedLog.userAgent && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    User Agent
                  </p>
                  <p className="text-sm text-gray-700 break-words">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}

              {/* Location */}
              {selectedLog.location && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Location
                  </p>
                  <div className="space-y-1">
                    {selectedLog.location.latitude &&
                      selectedLog.location.longitude && (
                        <p className="text-sm text-gray-700">
                          Coordinates: {selectedLog.location.latitude},{" "}
                          {selectedLog.location.longitude}
                        </p>
                      )}
                    {selectedLog.location.address && (
                      <p className="text-sm text-gray-700">
                        Address: {selectedLog.location.address}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata &&
                Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="border-b pb-3">
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      Additional Information
                    </p>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      {Object.entries(selectedLog.metadata).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="flex justify-between items-start"
                          >
                            <span className="text-sm font-medium text-gray-600 capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}:
                            </span>
                            <span className="text-sm text-gray-900 text-right ml-4">
                              {typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Target User */}
              {selectedLog.targetUser && (
                <div className="border-b pb-3">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Target User
                  </p>
                  <p className="text-base text-gray-900">
                    {selectedLog.targetUser.firstName}{" "}
                    {selectedLog.targetUser.lastName}
                    <span className="text-sm text-gray-500 ml-2">
                      ({selectedLog.targetUser.email})
                    </span>
                  </p>
                </div>
              )}

              {/* Log ID */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Log ID</p>
                <p className="text-xs text-gray-600 font-mono">
                  {selectedLog._id}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
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
