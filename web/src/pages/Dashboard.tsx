import { DataTable, type Column } from "@/components/DataTable";
import { PageContainer } from "@/components/PageContainer";
import { useState, useEffect } from "react";
import type { User } from "@/typeorm/entities/user.entity";
import { truncateText } from "@/utils/textTruncate";
import { Button } from "@/components/ui/button";
import { AuthService } from "@/services/authService";
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
import { Users, Package, Building2 } from "lucide-react";

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const pageSize = 10;

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
      render: (value: "Archived" | "Active" | "Pending") => {
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
              "border-red-500 app-text-error app-bg-surface hover:app-bg-error",
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
    if (!user._id) {
      toast.error("User ID is missing");
      return;
    }

    try {
      await UserPageService.rejectUser(user._id);
      toast.success(
        `${user.firstName} ${user.lastName}'s account has been rejected.`
      );
      setIsModalOpen(false);
      // Refresh the user list
      await fetchPage(currentPage);
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast.error("Failed to reject user. Please try again.");
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
  // Filter out the current user from the list
  const usersArray: User[] = (() => {
    let allUsers: User[] = [];

    if (users && users.length > 0) {
      allUsers = users;
    } else if (isPaginatedPayload(props.users)) {
      allUsers = props.users.data || [];
    } else if (Array.isArray(props.users)) {
      allUsers = props.users as User[];
    }

    // Filter out the current user
    if (currentUser && currentUser._id) {
      return allUsers.filter((user) => user._id !== currentUser._id);
    }

    return allUsers;
  })();

  // Apply ascending sorting by selected key
  const sortedUsers = [...usersArray].sort((a, b) => {
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

        {/* Users Table */}
        <div className="w-full">
          <DataTable
            title="User Accounts"
            columns={columns}
            data={sortedUsers}
            searchPlaceholder="Search users..."
            onSearch={(query) => onSearch(query)}
            loading={loading}
            emptyStateTitle="No Users Found"
            emptyStateDescription="You may try to input different keywords, check for typos, or adjust your filters."
            customControls={
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select
                  value={sortKey}
                  onValueChange={(value) =>
                    setSortKey(value as "lastName" | "email" | "status")
                  }
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
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
            onRowClick={handleRowClick}
          />
        </div>
        <div className="mt-4 flex items-center justify-between w-full">
          <div className="text-sm text-muted-foreground">
            Showing {sortedUsers.length} of {totalItems} users • Page{" "}
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
      </PageContainer>

      {/* User Detail Modal */}
      <UserDetailModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </>
  );
}
