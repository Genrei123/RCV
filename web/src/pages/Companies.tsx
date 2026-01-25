import { useState, useEffect } from "react";
import { Plus, Building2, Download, Link2, Archive, RefreshCw } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import type { Company } from "@/typeorm/entities/company.entity";
import { truncateText } from "@/utils/textTruncate";
import { AddCompanyModal } from "@/components/AddCompanyModal";
import { CompanyDetailsModal } from "@/components/CompanyDetailsModal";
import { CompanyService } from "@/services/companyService";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PDFGenerationService } from "@/services/pdfGenerationService";
import { toast } from "react-toastify";

export interface CompaniesProps {
  companies?: Company[];
  onCompanyClick?: (company: Company) => void;
  loading?: boolean;
  onRefresh?: () => void;
}

export function Companies(props: CompaniesProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>(props.companies || []);
  const [loading, setLoading] = useState(props.loading || false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<any | null>(null);
  const pageSize = 10;
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Disable body scroll when a modal is open
  useEffect(() => {
    const body = document.body;
    const previousOverflow = body.style.overflow;
    if (showAddModal || showDetailsModal) {
      body.style.overflow = "hidden";
    }
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [showAddModal, showDetailsModal]);

  // Fetch companies on mount
  useEffect(() => {
    if (props.companies && props.companies.length > 0) {
      setCompanies(props.companies);
    } else {
      // fetch first page if parent didn't provide companies
      fetchCompaniesPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.companies]);

  // Debounce search query changes (server-side fetch)
  useEffect(() => {
    const handle = setTimeout(() => {
      fetchCompaniesPage(1);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, activeTab]);

  // Fallback: Sometimes initial response/set doesn't include pagination yet (or parent passed just a single page array)
  // causing totalPages to evaluate to 1 and hiding the pagination controls until a manual refresh.
  // If we detect exactly a full page of items (length === pageSize) but no pagination metadata,
  // optimistically refetch the current page to obtain server pagination info.
  useEffect(() => {
    if (!pagination && companies.length === pageSize) {
      // This ensures we attempt to get pagination metadata once; fetchCompaniesPage will set pagination.
      fetchCompaniesPage(currentPage || 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, pagination]);

  // NOTE: legacy fetchCompanies removed in favor of server-driven fetchCompaniesPage

  // Server-driven: fetch a page
  const fetchCompaniesPage = async (page: number) => {
    setLoading(true);
    try {
      const resp = await CompanyService.getCompaniesPage(
        page,
        pageSize,
        searchQuery,
        activeTab
      );
      // debug: log server response for pagination diagnosis
      // eslint-disable-next-line no-console
      console.debug("Companies.fetchCompaniesPage response:", resp);
      // resp may have { data, pagination }
      // prefer resp.data or resp.companies
      const items = resp.data || (resp as any).companies || [];
      // Ensure the table's `products` column can derive a count:
      // if backend provides `productCount` (number) but not a full `products` array,
      // create a placeholder array with the right length so existing UI code
      // that uses `company.products?.length` continues to work.
      setCompanies(items);
      setPagination(resp.pagination || null);
      setCurrentPage(Number(resp.pagination?.current_page) || page);
    } catch (err) {
      console.error("Error fetching companies page:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = () => {
    // Refresh the companies list after adding a new company
    if (props.onRefresh) {
      props.onRefresh();
    } else {
      // refresh the current page so newly added items appear on the correct page
      fetchCompaniesPage(currentPage || 1);
    }
  };

  // Handle PDF certificate download
  const handleDownloadCertificate = async (
    company: Company,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent row click
    if (downloadingId) return; // Prevent multiple downloads
    
    setDownloadingId(company._id);
    try {
      toast.info("Generating certificate PDF...", { autoClose: 1000 });
      await PDFGenerationService.generateAndDownloadCompanyCertificate(company);
      toast.success("Certificate downloaded successfully!");
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast.error("Failed to generate certificate. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };
  
  const handleArchiveClick = async (company: Company, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm(`Are you sure you want to ${activeTab === 'active' ? 'archive' : 'activate'} "${company.name}"?`)) {
      return;
    }
    
    try {
      if (activeTab === 'active') {
        await CompanyService.archiveCompany(company._id);
        toast.success("Company archived successfully");
      } else {
        await CompanyService.unarchiveCompany(company._id);
        toast.success("Company restored successfully");
      }
      fetchCompaniesPage(currentPage);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Action failed");
    }
  };

  // Handle view company details
  const handleCompanyClick = (company: Company) => {
    setSelectedCompany(company);
    setShowDetailsModal(true);
    if (props.onCompanyClick) {
      props.onCompanyClick(company);
    }
  };

  const columns: Column[] = [
    {
      key: "name",
      label: "Company Name",
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Building2 className="h-4 w-4 text-teal-600" />
          </div>
          <span className="font-medium" title={value}>
            {truncateText(value)}
          </span>
        </div>
      ),
    },
    {
      key: "address",
      label: "Address",
      render: (value: string) => (
        <span title={value}>{truncateText(value)}</span>
      ),
    },
    {
      key: "licenseNumber",
      label: "License Number",
      render: (value: string) => (
        <span
          className="px-2 py-1 bg-neutral-100 text-neutral-700 rounded text-sm font-mono"
          title={value}
        >
          {truncateText(value)}
        </span>
      ),
    },
    {
      key: "productCount",
      label: "Products",
      render: (value: any) => {
        const productCount = value || 0;
        return (
          <span className="px-2 py-1 app-bg-primary-soft app-text-primary rounded text-sm font-medium">
            {productCount} {productCount === 1 ? "Product" : "Products"}
          </span>
        );
      },
    },
    {
      key: "sepoliaTransactionId",
      label: "Tx Hash",
      render: (value: string) => {
        if (!value) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return (
          <a
            href={`https://sepolia.etherscan.io/tx/${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-mono"
            title={value}
            onClick={(e) => e.stopPropagation()}
          >
            <Link2 className="h-3 w-3" />
            {value.substring(0, 10)}...
          </a>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row: Company) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation(); // Prevent row click
              handleCompanyClick(row);
            }}
          >
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => handleArchiveClick(row, e)}
            className={activeTab === 'archived' ? "text-green-600 hover:text-green-700" : "text-amber-600 hover:text-amber-700"}
            title={activeTab === 'active' ? "Archive" : "Restore"}
          >
            {activeTab === 'active' ? <Archive className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => handleDownloadCertificate(row, e)}
            disabled={downloadingId !== null}
            className="app-text-primary hover:opacity-90 hover:app-bg-primary-soft disabled:opacity-50"
            title="Download Certificate"
          >
            <Download className={`h-4 w-4 ${downloadingId === row._id ? 'animate-pulse' : ''}`} />
          </Button>
        </div>
      ),
    },
  ];

  const onSearch = (query: string) => {
    // Server-side search implementation (same as Products)
    setSearchQuery(query);
  };

  const totalItems = pagination?.total_items ?? companies.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedCompanies = companies;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <>
      <PageContainer
        title="Companies"
        description="Manage and view all registered companies in the system."
      >
        {/* Header Summary */}
        <div className="flex items-center justify-end mb-4">
          <div className="text-sm text-neutral-600">
            <span className="font-medium">
              {pagination?.total_items ?? companies.length}
            </span>{" "}
            {(pagination?.total_items ?? companies.length) === 1
              ? "company"
              : "companies"}{" "}
            registered
          </div>
        </div>

        {/* Data Table */}
        <>
          <DataTable
            title="Company List"
            columns={columns}
            data={pagedCompanies}
            searchPlaceholder="Search companies..."
            onSearch={onSearch}
            loading={loading}
            emptyStateTitle="No Companies Found"
            emptyStateDescription="Try adjusting your search or add a new company to get started."
            customControls={
              <>
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="whitespace-nowrap cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
                <div className="flex bg-muted p-1 rounded-md ml-2">
                  <button
                    onClick={() => setActiveTab("active")}
                    className={`px-3 py-1 text-sm rounded-sm transition-all ${
                      activeTab === "active"
                        ? "bg-white shadow text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setActiveTab("archived")}
                    className={`px-3 py-1 text-sm rounded-sm transition-all ${
                      activeTab === "archived"
                        ? "bg-white shadow text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Archived
                  </button>
                </div>
              </>
            }
          />

          <div className="mt-4 flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              Showing {pagedCompanies.length} of {totalItems} companies • Page{" "}
              {currentPage} of {totalPages}
            </div>

            <Pagination className="mx-0 w-auto">
              <PaginationContent className="gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      currentPage > 1 && fetchCompaniesPage(currentPage - 1)
                    }
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
                      onClick={() => fetchCompaniesPage(1)}
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
                      onClick={() => fetchCompaniesPage(currentPage - 1)}
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
                      onClick={() => fetchCompaniesPage(currentPage + 1)}
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
                      onClick={() => fetchCompaniesPage(totalPages)}
                      className="cursor-pointer"
                    >
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      currentPage < totalPages &&
                      fetchCompaniesPage(currentPage + 1)
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
        </>
      </PageContainer>

      {/* Add Company Modal */}
      <AddCompanyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Company Details Modal */}
      <CompanyDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        company={selectedCompany}
      />
    </>
  );
}
