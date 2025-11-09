import { DataTable, type Column } from "@/components/DataTable";
import { PageContainer } from "@/components/PageContainer";
import { useState, useEffect } from "react";
import type { User } from "@/typeorm/entities/user.entity";
import { Button } from "@/components/ui/button";
import { AuthService } from "@/services/authService";
import { Pagination } from "@/components/Pagination";
import { DashboardService, type DashboardStats } from "@/services/dashboardService";
import { UserDetailModal } from "@/components/UserDetailModal";
import { UserPageService } from "@/services/userPageService";
import { toast } from "react-toastify";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Package, Building2, Activity } from "lucide-react";

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
    },
    {
      key: "lastName",
      label: "Last Name",
    },
    {
      key: "email",
      label: "Email",
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value: 'Archived' | 'Active' | 'Pending') => {
        const statusConfig: {
          [key: string]: {
            label: string;
            className: string;
          };
        } = {
          Pending: { 
            label: "Pending", 
            className: "border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100" 
          },
          Active: { 
            label: "Active", 
            className: "border-green-500 text-green-700 bg-green-50 hover:bg-green-100" 
          },
          Archived: { 
            label: "Archived", 
            className: "border-gray-500 text-gray-700 bg-gray-50 hover:bg-gray-100" 
          },
        };
        const config = statusConfig[value] || statusConfig['Pending'];
        return (
          <span className={`inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium border min-w-[80px] ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      label: "Created At",
      render: (value: string | Date) => {
        if (!value) return 'N/A';
        try {
          const date = new Date(value);
          // Check if date is valid
          if (isNaN(date.getTime())) return 'Invalid Date';
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch (error) {
          return 'Invalid Date';
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
      toast.error('User ID is missing');
      return;
    }
    
    try {
      await UserPageService.approveUser(user._id);
      toast.success(`${user.firstName} ${user.lastName}'s account has been approved!`);
      setIsModalOpen(false);
      // Refresh the user list
      await fetchPage(currentPage);
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user. Please try again.');
    }
  };

  const handleReject = async (user: User) => {
    if (!user._id) {
      toast.error('User ID is missing');
      return;
    }
    
    try {
      await UserPageService.rejectUser(user._id);
      toast.success(`${user.firstName} ${user.lastName}'s account has been rejected.`);
      setIsModalOpen(false);
      // Refresh the user list
      await fetchPage(currentPage);
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user. Please try again.');
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
      return allUsers.filter(user => user._id !== currentUser._id);
    }

    return allUsers;
  })();

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
  const   fetchPage = async (page: number) => {
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

  return (
    <>
      <PageContainer title="Dashboard" description="Overview of system statistics and user management">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Users */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {statsLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      stats?.totalUsers || 0
                    )}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Products */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Products</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {statsLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      stats?.totalProducts || 0
                    )}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Companies */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Companies</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {statsLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      stats?.totalCompanies || 0
                    )}
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <DataTable
          title="Users"
          columns={columns}
          data={usersArray}
          searchPlaceholder="Search users..."
          onSearch={(query) => onSearch(query)}
          loading={loading}
          emptyStateTitle="No Users Found"
          emptyStateDescription="You may try to input different keywords, check for typos, or adjust your filters."
          onRowClick={handleRowClick}
        />
        <div className="mt-4 flex items-center justify-between">
          <div>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={pageSize}
              onPageChange={(page) => fetchPage(page)}
              showingPosition="right"
            />
          </div>
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
