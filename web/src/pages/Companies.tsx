import { useState, useEffect } from "react";
import { Plus, Building2, Download } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import type { Company } from "@/typeorm/entities/company.entity";
import { AddCompanyModal } from "@/components/AddCompanyModal";
import { CompanyDetailsModal } from "@/components/CompanyDetailsModal";
import { CompanyService } from "@/services/companyService";
import { Pagination } from "@/components/Pagination";
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
  }, [props.companies]);

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
      const resp = await CompanyService.getCompaniesPage(page, pageSize);
      // debug: log server response for pagination diagnosis
      // eslint-disable-next-line no-console
      console.debug("Companies.fetchCompaniesPage response:", resp);
      // resp may have { data, pagination }
      // prefer resp.data or resp.companies
      const items = resp.data || (resp as any).companies || [];
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
    try {
      toast.info("Generating certificate PDF...", { autoClose: 1000 });
      await PDFGenerationService.generateAndDownloadCompanyCertificate(company);
      toast.success("Certificate downloaded successfully!");
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast.error("Failed to generate certificate. Please try again.");
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
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: "address",
      label: "Address",
    },
    {
      key: "licenseNumber",
      label: "License Number",
      render: (value: string) => (
        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono">
          {value}
        </span>
      ),
    },
    {
      key: "products",
      label: "Products",
      render: (value: any[]) => {
        const productCount = value?.length || 0;
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
            {productCount} {productCount === 1 ? "Product" : "Products"}
          </span>
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
            View Details
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => handleDownloadCertificate(row, e)}
            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
          >
            <Download className="h-4 w-4 mr-1" />
            Certificate
          </Button>
        </div>
      ),
    },
  ];

  const onSearch = (query: string) => {
    // Search functionality can be implemented here
    console.log("Search query:", query);
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
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">
                {pagination?.total_items ?? companies.length}
              </span>{" "}
              {(pagination?.total_items ?? companies.length) === 1
                ? "company"
                : "companies"}{" "}
              registered
            </div>
          </div>
        </div>

        {/* Data Table */}
        <>
          <DataTable
            title=""
            columns={columns}
            data={pagedCompanies}
            searchPlaceholder="Search companies..."
            onSearch={onSearch}
            loading={loading}
            emptyStateTitle="No Companies Found"
            emptyStateDescription="Try adjusting your search or add a new company to get started."
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
                onPageChange={(p: number) => fetchCompaniesPage(p)}
                showingPosition="right"
              />
            </div>
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
