import { useState, useEffect, type ComponentType } from "react"
import { Dashboard } from "@/pages/Dashboard"
import { Users, UserCheck, MonitorSpeaker } from "lucide-react"
import type { StatItem } from "@/components/StatsGrid"

// Define the audit record type
interface AuditRecord {
  location: string;
  action: string;
  date: string;
  type: string;
  status: string;
}

// Mock API functions - replace these with your actual API calls
const fetchStats = async (): Promise<StatItem[]> => {
  // In production this should call the real stats API. No artificial delay here.
  return [
    {
      icon: <Users className="h-6 w-6 text-green-500" />,
      label: "ADMIN USERS",
      value: 5423,
      bgColor: "bg-green-50"
    },
    {
      icon: <UserCheck className="h-6 w-6 text-green-500" />,
      label: "TOTAL USERS", 
      value: 1893,
      bgColor: "bg-green-50"
    },
    {
      icon: <MonitorSpeaker className="h-6 w-6 text-green-500" />,
      label: "ADMIN ACTIVE",
      value: 189,
      bgColor: "bg-green-50"
    }
  ];
};

const fetchAuditData = async (page: number = 1, search: string = "") => {
  // In production this should call the real audit API. No artificial delay here.
  const allData = [
    {
      location: "Manila Office",
      action: "Product Verified",
      date: "2024-01-15",
      type: "Verification",
      status: "Success"
    },
    {
      location: "Cebu Branch",
      action: "User Login",
      date: "2024-01-14", 
      type: "Authentication",
      status: "Success"
    },
    {
      location: "Davao Center",
      action: "Product Added",
      date: "2024-01-14",
      type: "Creation",
      status: "Pending"
    },
    {
      location: "Quezon Office",
      action: "Blockchain Sync",
      date: "2024-01-13",
      type: "System",
      status: "Failed"
    }
  ];

  // Filter by search if provided
  const filteredData = search 
    ? allData.filter(item => 
        Object.values(item).some(value => 
          value.toLowerCase().includes(search.toLowerCase())
        )
      )
    : allData;

  return {
    data: filteredData,
    totalItems: filteredData.length,
    totalPages: Math.ceil(filteredData.length / 10),
    currentPage: page
  };
};

export function DashboardContainer() {
  const [stats, setStats] = useState<StatItem[]>([]);
  const [auditData, setAuditData] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Load data on page or search change
  useEffect(() => {
    loadAuditData(currentPage, searchQuery);
  }, [currentPage, searchQuery]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, auditResponse] = await Promise.all([
        fetchStats(),
        fetchAuditData(1, "")
      ]);
      
      setStats(statsData);
      setAuditData(auditResponse.data);
      setTotalPages(auditResponse.totalPages);
      setTotalItems(auditResponse.totalItems);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditData = async (page: number, search: string) => {
    try {
      setAuditLoading(true);
      const response = await fetchAuditData(page, search);
      setAuditData(response.data);
      setTotalPages(response.totalPages);
      setTotalItems(response.totalItems);
      setCurrentPage(response.currentPage);
    } catch (error) {
      console.error("Error loading audit data:", error);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleSort = (sortBy: string) => {
    console.log("Sort by:", sortBy);
    // Implement sorting logic here
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const DashboardComponent = Dashboard as ComponentType<any>;

  return (
    <DashboardComponent
      stats={stats}
      auditData={auditData}
      loading={loading || auditLoading}
      onSearch={handleSearch}
      onSort={handleSort}
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      itemsPerPage={10}
      onPageChange={handlePageChange}
    />
  );
}