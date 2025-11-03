import { Badge } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { PageContainer } from "@/components/PageContainer";
import { useState, useEffect } from "react";
import type { User } from "@/typeorm/entities/user.entity";
import { Button } from "@/components/ui/button";
import { AuthService } from "@/services/authService";
import { Pagination } from "@/components/Pagination";
import { DashboardService } from "@/services/dashboardService";
import { UserDetailModal } from "@/components/UserDetailModal";
import { UserPageService } from "@/services/userPageService";
import { toast } from "react-toastify";

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
  const pageSize = 10;

  useEffect(() => {
    fetchCurrentUser();
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

  const getGreeting = (): string => {
    if (!currentUser) return "Hello 👋";
    const firstName = currentUser.firstName || "User";
    return `Hello ${firstName} 👋`;
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
      key: "role",
      label: "Role",
      render: (value: number) => {
        const roleMap: {
          [key: number]: {
            label: string;
            variant: "default" | "secondary" | "destructive";
          };
        } = {
          1: { label: "Agent", variant: "default" },
          2: { label: "Admin", variant: "secondary" },
          3: { label: "Super Admin", variant: "destructive" },
        };
        const role = roleMap[value] || { label: "Unknown", variant: "default" };
        return <Badge>{role.label}</Badge>;
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
  const usersArray: User[] = (() => {
    if (users && users.length > 0) return users;
    if (isPaginatedPayload(props.users)) return props.users.data || [];
    if (Array.isArray(props.users)) return props.users as User[];
    return [];
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
      <PageContainer title={getGreeting()}>
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
