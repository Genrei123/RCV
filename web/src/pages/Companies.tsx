import { useState, useEffect } from 'react';
import { Plus, Building2 } from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/DataTable';
import type { Company } from '@/typeorm/entities/company.entity';
import { AddCompanyModal } from '@/components/AddCompanyModal';
import { CompanyService } from '@/services/companyService';

export interface CompaniesProps {
  companies?: Company[];
  onCompanyClick?: (company: Company) => void;
  loading?: boolean;
  onRefresh?: () => void;
}

export function Companies(props: CompaniesProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [companies, setCompanies] = useState<Company[]>(props.companies || []);
  const [loading, setLoading] = useState(props.loading || false);

  // Fetch companies on mount
  useEffect(() => {
    if (!props.companies) {
      fetchCompanies();
    } else {
      setCompanies(props.companies);
    }
  }, [props.companies]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const data = await CompanyService.getAllCompanies();
      setCompanies(data.companies || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = () => {
    // Refresh the companies list after adding a new company
    if (props.onRefresh) {
      props.onRefresh();
    } else {
      fetchCompanies();
    }
  };

  const columns: Column[] = [
    {
      key: 'name',
      label: 'Company Name',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Building2 className="h-4 w-4 text-teal-600" />
          </div>
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'address',
      label: 'Address'
    },
    {
      key: 'licenseNumber',
      label: 'License Number',
      render: (value: string) => (
        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono">
          {value}
        </span>
      )
    },
    {
      key: 'products',
      label: 'Products',
      render: (value: any[]) => {
        const productCount = value?.length || 0;
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
            {productCount} {productCount === 1 ? 'Product' : 'Products'}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row: Company) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => props.onCompanyClick?.(row)}
          >
            View Details
          </Button>
        </div>
      )
    }
  ];

  const onSearch = (query: string) => {
    // Search functionality can be implemented here
    console.log('Search query:', query);
  };

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
              <span className="font-medium">{companies.length}</span> {companies.length === 1 ? 'company' : 'companies'} registered
            </div>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          title=""
          columns={columns}
          data={companies}
          searchPlaceholder="Search companies by name, address, or license number..."
          onSearch={onSearch}
          onSort={(sortKey) => console.log('Sort by:', sortKey)}
          loading={loading}
          emptyStateTitle="No Companies Found"
          emptyStateDescription="Try adjusting your search or add a new company to get started."
        />
      </PageContainer>

      {/* Add Company Modal */}
      <AddCompanyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />
    </>
  );
}
