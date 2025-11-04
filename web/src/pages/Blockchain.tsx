import { PageContainer } from "@/components/PageContainer";
import { useState, useEffect } from "react";
import { CertificateBlockchainService, type CertificateBlockchainData, type BlockchainStats } from "@/services/certificateBlockchainService";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, FileCheck, Building2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Blockchain() {
  const [certificates, setCertificates] = useState<CertificateBlockchainData[]>([]);
  const [stats, setStats] = useState<BlockchainStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const pageSize = 20;

  useEffect(() => {
    fetchData();
  }, [currentPage]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch certificates
    const certResponse = await CertificateBlockchainService.getCertificates(currentPage, pageSize);
    if (certResponse.success) {
      setCertificates(certResponse.certificates);
      setPagination(certResponse.pagination);
    }

    // Fetch stats
    const statsResponse = await CertificateBlockchainService.getStats();
    if (statsResponse.success) {
      setStats(statsResponse.stats);
    }

    setLoading(false);
  };

  const columns: Column[] = [
    {
      key: "blockIndex",
      label: "Block #",
      render: (value: number) => (
        <Badge variant="outline" className="font-mono">
          #{value}
        </Badge>
      ),
    },
    {
      key: "certificateId",
      label: "Certificate ID",
      render: (value: string) => (
        <span className="font-mono text-sm">{value.substring(0, 20)}...</span>
      ),
    },
    {
      key: "certificateType",
      label: "Type",
      render: (value: string) => (
        <Badge variant={value === 'company' ? 'default' : 'secondary'}>
          {value === 'company' ? (
            <><Building2 className="h-3 w-3 mr-1" /> Company</>
          ) : (
            <><Package className="h-3 w-3 mr-1" /> Product</>
          )}
        </Badge>
      ),
    },
    {
      key: "entityName",
      label: "Entity",
    },
    {
      key: "issuedDate",
      label: "Issued",
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: "isValid",
      label: "Status",
      render: (value: boolean) => (
        <Badge variant={value ? "default" : "destructive"}>
          {value ? "✓ Valid" : "✗ Invalid"}
        </Badge>
      ),
    },
  ];

  const totalPages = pagination ? pagination.total_pages : 1;

  return (
    <PageContainer
      title="Certificate Blockchain"
      description="Immutable certificate verification powered by blockchain technology"
    >
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Certificates</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : stats?.totalCertificates || 0}
                </p>
              </div>
              <div className="p-3 bg-teal-100 rounded-lg">
                <FileCheck className="h-6 w-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Company Certs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : stats?.companyCertificates || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Product Certs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : stats?.productCertificates || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Chain Status</p>
                <div className="flex items-center gap-2">
                  {loading ? (
                    <span className="text-sm">Loading...</span>
                  ) : (
                    <>
                      <div className={`h-3 w-3 rounded-full ${stats?.chainIntegrity ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm font-semibold">
                        {stats?.chainIntegrity ? 'Valid' : 'Compromised'}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blockchain Info */}
      {stats && (
        <Card className="mb-6">
          <CardContent className="p-6">
            {stats.latestCertificate && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Latest Certificate:</p>
                <p className="font-semibold text-gray-900">{stats.latestCertificate.entityName}</p>
                <p className="text-xs text-gray-500 font-mono mt-1">
                  ID: {stats.latestCertificate.certificateId}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Certificates Table */}
      <div className="bg-white rounded-lg shadow">
        <DataTable
          title="Certificate Blockchain Records"
          columns={columns}
          data={certificates}
          searchPlaceholder="Search certificates..."
          loading={loading}
          emptyStateTitle="No Certificates Found"
          emptyStateDescription="Certificates will appear here once they are generated and added to the blockchain."
        />

        {pagination && (
          <div className="p-4 border-t flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} ({pagination.total_items} total certificates)
              </span>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={pagination.total_items}
              itemsPerPage={pageSize}
              onPageChange={setCurrentPage}
              showingPosition="right"
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}