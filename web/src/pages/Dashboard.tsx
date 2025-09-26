import { Users, UserCheck, MonitorSpeaker } from "lucide-react"
import { StatsGrid, type StatItem } from "@/components/StatsGrid"
import { DataTable, type Column } from "@/components/DataTable"
import { Pagination } from "@/components/Pagination"
import { PageContainer } from "@/components/PageContainer"

// Define the audit data type
interface AuditRecord {
  location: string;
  action: string;
  date: string;
  type: string;
  status: string;
}

interface DashboardProps {
  stats?: StatItem[];
  auditData?: AuditRecord[];
  loading?: boolean;
  onSearch?: (query: string) => void;
  onSort?: (sortBy: string) => void;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
}

export function Dashboard({
  stats,
  auditData,
  loading = false,
  onSearch,
  onSort,
  currentPage = 1,
  totalPages = 3,
  totalItems = 38,
  itemsPerPage = 10,
  onPageChange
}: DashboardProps) {
    // Default stats data
    const defaultStats: StatItem[] = [
        {
            icon: <Users className="h-6 w-6 text-teal-600" />,
            label: "ADMIN USERS",
            value: "5,423",
            bgColor: "bg-teal-50"
        },
        {
            icon: <UserCheck className="h-6 w-6 text-teal-600" />,
            label: "TOTAL USERS",
            value: "1,893",
            bgColor: "bg-teal-50"
        },
        {
            icon: <MonitorSpeaker className="h-6 w-6 text-teal-600" />,
            label: "ADMIN ACTIVE",
            value: "189",
            bgColor: "bg-teal-50"
        }
    ];

    // Default audit data - empty array to show "No data found" state
    const defaultAuditData: AuditRecord[] = [
        // Uncomment to show data:
        // {
        //     location: "Manila Office",
        //     action: "Product Verified",
        //     date: "2024-01-15",
        //     type: "Verification",
        //     status: "Success"
        // },
        // {
        //     location: "Cebu Branch",
        //     action: "User Login",
        //     date: "2024-01-14",
        //     type: "Authentication",
        //     status: "Success"
        // },
        // {
        //     location: "Davao Center",
        //     action: "Product Added",
        //     date: "2024-01-14",
        //     type: "Creation",
        //     status: "Pending"
        // },
        // {
        //     location: "Quezon Office",
        //     action: "Blockchain Sync",
        //     date: "2024-01-13",
        //     type: "System",
        //     status: "Failed"
        // }
    ];

    // Define table columns
    const auditColumns: Column[] = [
        { key: 'location', label: 'Location' },
        { key: 'action', label: 'Action' },
        { key: 'date', label: 'Date' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status' } // This will auto-render as badges
    ];

    // Use provided data or defaults
    const statsData = stats || defaultStats;
    const tableData = auditData || defaultAuditData;

    return (
        <PageContainer title="Hello karina 👋">
            {/* Stats Cards */}
            <StatsGrid stats={statsData} loading={loading} />

            {/* Audit Trail Section */}
            <DataTable
                title="Audit Trail"
                columns={auditColumns}
                data={tableData}
                searchPlaceholder="Search audit logs..."
                onSearch={onSearch}
                onSort={onSort}
                loading={loading}
                emptyStateTitle="No Audits Result"
                emptyStateDescription="You may try to input different keywords, check for typos, or adjust your filters."
            />

            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={onPageChange}
                showingText={`Showing ${Math.min(tableData.length, itemsPerPage)} out of ${totalItems} SKUs results`}
            />
        </PageContainer>
    );
}