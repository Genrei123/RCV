import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { PageContainer } from "@/components/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import {
  User,
  Mail,
  MapPin,
  Calendar,
  Phone,
  Badge as BadgeIcon,
  Eye,
} from "lucide-react";
import { UserPageService, type UserProfile } from "@/services/userPageService";
import { AuditLogService, type AuditLog } from "@/services/auditLogService";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Read-only view of another user's profile+activities
export function UserProfileView() {
  const { id } = useParams<{ id: string }>();
  const locationHook = useLocation();
  const userHint = (locationHook.state as any)?.userHint;
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullAuditLogs, setFullAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPagination, setLogsPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_pages: 1,
    total_items: 0,
  });
  const [sortBy, setSortBy] = useState<"all" | "platform" | "action" | "compliance" | "scans">("all");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    if (!id) return;
    // Prefill from navigation hint if available for immediate UI feedback
    if (userHint) {
      const hint = userHint as any;
      const name: string = hint.name || hint.fullName || "";
      const parts = name.trim().split(/\s+/);
      const prefill: any = {
        firestoreId: hint.id || hint._id,
        firstName: parts[0] || "Unknown",
        middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : undefined,
        lastName: parts.length > 1 ? parts[parts.length - 1] : "User",
        role: hint.role,
        badgeId: hint.badgeId,
        location: hint.location?.address || undefined,
        email: hint.email || "N/A",
      };
      setUser(prefill);
    }
        const loadData = async () => {
      try {
        const loadedUser = await fetchUser();
        if (loadedUser?._id) {
          console.log(`[UserProfileView] User has MySQL ID: ${loadedUser._id}, fetching audit logs...`);
          await fetchUserAuditLogs(loadedUser._id);
        } else {
          console.log("[UserProfileView] No MySQL user ID available, skipping audit logs");
          setFullAuditLogs([]);
        }
      } catch (e) {
        console.error("[UserProfileView] Error loading data:", e);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchUser = async (): Promise<UserProfile | null> => {
    try {
      if (!id) return null;
      
      console.log(`[UserProfileView] Fetching user with ID: ${id}`);
      
      try {
        const resp = await UserPageService.getUserById(id);
        if (resp.profile) {
          const p = { ...resp.profile } as any;
          // Fallbacks for differing API field names
          if (!p.email && p.email_address) p.email = p.email_address;
          if (!p.location && p.address) p.location = p.address;
          if (!p.phoneNumber && (p.phone || p.phone_number))
            p.phoneNumber = p.phone || p.phone_number;
          // Derive names from fullName if individual parts missing
          const hasNames = p.firstName || p.lastName || p.middleName;
          if (!hasNames && p.fullName) {
            const parts = String(p.fullName).trim().split(/\s+/);
            if (parts.length) p.firstName = parts[0];
            if (parts.length > 2) p.middleName = parts.slice(1, -1).join(" ");
            if (parts.length > 1) p.lastName = parts[parts.length - 1];
          }
          setUser(p);
          console.log("[UserProfileView] User loaded from MySQL successfully");
          return p;
        }
      } catch (fetchError: any) {
        // User not found in MySQL - try to sync first
        console.log(`[UserProfileView] User not found in MySQL, attempting to sync Firebase user...`);
        
        try {
          // Call sync endpoint to create/link user from Firebase
          const syncResult = await UserPageService.syncUserFromFirebase(id);
          console.log(`[UserProfileView] Sync successful, got user:`, syncResult);
          setUser(syncResult);
          return syncResult;
        } catch (syncError: any) {
          console.error(`[UserProfileView] Sync failed:`, syncError);
          console.log("[UserProfileView] Will continue with prefilled Firestore data");
          // Continue with prefilled data
        }
      }
      return null;
    } catch (e) {
      console.error("[UserProfileView] Unexpected error in fetchUser:", e);
      return null;
    }
  };

  const fetchUserAuditLogs = async (userId: string) => {
    setLogsLoading(true);
    try {
      console.log(`[UserProfileView] Fetching audit logs for user ID: ${userId}`);
      
      // Pull all logs then filter by userId
      const first = await AuditLogService.getAllLogs(
        1,
        logsPagination.per_page
      );
      if (!first || !first.pagination) throw new Error("Invalid response");
      let all: AuditLog[] = [...(first.data || [])];
      for (let p = 2; p <= (first.pagination.total_pages || 1); p++) {
        const resp = await AuditLogService.getAllLogs(
          p,
          first.pagination.per_page
        );
        all = all.concat(resp.data || []);
      }
      
      console.log(`[UserProfileView] Total logs fetched: ${all.length}, filtering for user: ${userId}`);
      const filtered = all.filter((l) => l.userId === userId);
      
      console.log(`[UserProfileView] Found ${filtered.length} audit logs for user`);
      setFullAuditLogs(filtered);
      setLogsPagination({
        current_page: 1,
        per_page: first.pagination.per_page,
        total_pages:
          Math.ceil(filtered.length / first.pagination.per_page) || 1,
        total_items: filtered.length,
      });
    } catch (e: any) {
      console.error("[UserProfileView] Error fetching audit logs:", e);
      setFullAuditLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

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
        return pa - pb;
      });
    }
    if (sortBy === "action")
      return arr.sort((a, b) => a.action.localeCompare(b.action));
    if (sortBy === "compliance") {
      return arr.filter(log => log.actionType === "COMPLIANCE_REPORT").sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    if (sortBy === "scans") {
      return arr.filter(log => log.actionType === "SCAN_PRODUCT").sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return arr;
  }, [fullAuditLogs, sortBy]);

  const currentPageLogs = useMemo(() => {
    const start = (logsPagination.current_page - 1) * logsPagination.per_page;
    return sortedFullLogs.slice(start, start + logsPagination.per_page);
  }, [sortedFullLogs, logsPagination]);

  const activityColumns: Column[] = [
    {
      key: "action",
      label: "Action",
      render: (value) => {
        if (typeof value !== "string")
          return (
            <span className="font-medium text-neutral-900">
              {String(value)}
            </span>
          );
        const MAX_LEN = 40;
        const truncated =
          value.length > MAX_LEN ? value.slice(0, MAX_LEN) + "…" : value;
        return (
          <span className="font-medium text-neutral-900" title={value}>
            {truncated}
          </span>
        );
      },
    },
    {
      key: "platform",
      label: "Platform",
      render: (value: string) => (
        <span className="text-sm text-neutral-600">{value}</span>
      ),
    },
    {
      key: "createdAt",
      label: "Date & Time",
      render: (value: string) => {
        if (!value) return "N/A";
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
      },
    },
    {
      key: "_id",
      label: "Actions",
      render: (_value: string, row: any) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewDetails(row as AuditLog)}
          className="flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View Details
        </Button>
      ),
    },
  ];

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const getFullName = (u: UserProfile | null) => {
    if (!u) return "User";
    const anyU = u as any;
    // Prefer explicit fullName or name fields
    if (anyU.fullName && typeof anyU.fullName === "string")
      return anyU.fullName.trim();
    if (anyU.name && typeof anyU.name === "string") return anyU.name.trim();
    // Build from individual parts
    const parts = [u.firstName, u.middleName, u.lastName]
      .map((p) => (p ? String(p).trim() : ""))
      .filter(Boolean);
    if (parts.length) return parts.join(" ");
    // Do NOT fall back to email to avoid showing email as display name
    return "User";
  };

  const getRoleName = (role?: number | string) => {
    if (!role) return "User";
    if (typeof role === "string") {
      const normalized = role.toUpperCase();
      const strMap: Record<string, string> = {
        AGENT: "Agent",
        ADMIN: "Admin",
        USER: "User",
        SUPER_ADMIN: "Super Admin",
      };
      return strMap[normalized] || role;
    }
    const map: Record<number, string> = {
      1: "Agent",
      2: "Admin",
      3: "Super Admin",
    };
    return map[role] || String(role);
  };

  if (loading) {
    return (
      <PageContainer title="Searched User" description="Loading user data...">
        <div className="animate-pulse">
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
      title="Searched User"
      description="Viewing user information and activity"
      headerAction={null}
    >
      <div className="grid w-full grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        <Card className="w-full">
          <CardContent className="p-4 sm:p-6 w-full">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-neutral-900 mb-1">
                Profile Information
              </h2>
              <p className="text-sm text-neutral-600">Read-only view</p>
            </div>
            <div className="text-center mb-8">
              <div className="relative inline-block">
                <div className="w-24 h-24 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={getFullName(user)}
                      className="w-full h-full object-cover"
                      //added a non draggable profile picture also                      
                      draggable="false"
                    />
                  ) : (
                    <User className="w-12 h-12 text-neutral-500" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  {getFullName(user)}
                </h3>
                <p className="text-sm text-neutral-600">
                  {getRoleName(user?.role)}
                </p>
              </div>
            </div>
            <div className="space-y-4 w-full">
              <div className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg w-full">
                <Mail className="w-5 h-5 text-neutral-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900">Email</p>
                  <p className="text-sm text-neutral-600 break-all">
                    {(user as any)?.email ||
                      (user as any)?.email_address ||
                      "Not provided"}
                  </p>
                </div>
              </div>
              {((user as any)?.location || (user as any)?.address) && (
                <div className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg w-full">
                  <MapPin className="w-5 h-5 text-neutral-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      Location
                    </p>
                    <p className="text-sm text-neutral-600 break-words">
                      {(user as any).location || (user as any).address}
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
              {((user as any)?.phoneNumber ||
                (user as any)?.phone ||
                (user as any)?.phone_number) && (
                <div className="flex items-start gap-3 p-3 border border-neutral-200 rounded-lg w-full">
                  <Phone className="w-5 h-5 text-neutral-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      Phone Number
                    </p>
                    <p className="text-sm text-neutral-600 break-all">
                      {(user as any).phoneNumber ||
                        (user as any).phone ||
                        (user as any).phone_number}
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
        <Card className="w-full">
          <CardContent className="p-4 sm:p-6 w-full">
            <div className="mb-4 w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-xl font-semibold text-neutral-900">
                Recent Activities
              </h2>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="activity-sort"
                  className="text-sm text-neutral-600 hidden sm:block"
                >
                  Sort:
                </label>
                <select
                  id="activity-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm"
                >
                  <option value="all">All (default)</option>
                  <option value="action">Action (A–Z)</option>
                  <option value="compliance">Compliance Reports</option>
                  <option value="scans">Scanned Products</option>
                </select>
              </div>
            </div>
            <div className="mb-6 w-full">
              <DataTable
                title=""
                columns={activityColumns}
                data={currentPageLogs}
                loading={logsLoading}
                emptyStateTitle="No Activities Found"
                emptyStateDescription="This user's activities will appear here."
                showSearch={false}
              />
            </div>
            <div className="mt-2">
              <Pagination
                currentPage={logsPagination.current_page}
                totalPages={
                  Math.ceil(
                    logsPagination.total_items / logsPagination.per_page
                  ) || 1
                }
                totalItems={logsPagination.total_items}
                itemsPerPage={logsPagination.per_page}
                onPageChange={(page) =>
                  setLogsPagination((prev) => ({ ...prev, current_page: page }))
                }
                showingText={`Showing ${currentPageLogs.length} of ${logsPagination.total_items} activities`}
                showingPosition="right"
              />
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-neutral-500 mb-1">
                  Action
                </p>
                <p className="text-base font-semibold text-neutral-900">
                  {selectedLog.action}
                </p>
              </div>
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
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-neutral-500 mb-1">
                  Platform
                </p>
                <p className="text-base text-neutral-900">
                  {selectedLog.platform === "WEB" ? "Web" : "Mobile"}
                </p>
              </div>
              <div className="border-b pb-3">
                <p className="text-sm font-medium text-neutral-500 mb-1">
                  Date & Time
                </p>
                <p className="text-base text-neutral-900">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </p>
              </div>
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
    </PageContainer>
  );
}
