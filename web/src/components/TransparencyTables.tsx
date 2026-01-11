import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ExternalLink,
  Package,
  Building2,
  Shield,
  Loader2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  PublicService,
  type PublicProduct,
  type PublicCompany,
  type PublicStats,
} from '@/services/publicService';

export function TransparencyTables() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'companies'>('products');
  const [productPage, setProductPage] = useState(1);
  const [companyPage, setCompanyPage] = useState(1);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [companyTotalPages, setCompanyTotalPages] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, companiesRes, statsRes] = await Promise.all([
        PublicService.getVerifiedProducts(productPage, 5),
        PublicService.getVerifiedCompanies(companyPage, 5),
        PublicService.getStats(),
      ]);
      setProducts(productsRes.data);
      setProductTotalPages(productsRes.pagination.total_pages);
      setCompanies(companiesRes.data);
      setCompanyTotalPages(companiesRes.pagination.total_pages);
      setStats(statsRes);
    } catch (error) {
      console.error('Failed to fetch public data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [productPage, companyPage]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const truncateHash = (hash: string) => {
    if (!hash) return 'N/A';
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`;
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-2 text-gray-600">Loading verified records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Package className="h-5 w-5 text-teal-600" />
              </div>
              <span className="text-sm text-gray-600">Verified Products</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.verifiedProducts}</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-600">Verified Companies</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.verifiedCompanies}</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-sm text-gray-600">Total Products</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-sm text-gray-600">Total Companies</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalCompanies}</p>
          </div>
        </div>
      )}

      {/* Tables with Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'products' | 'companies')}>
          <div className="border-b border-gray-200 px-4 pt-4">
            <TabsList className="bg-gray-100">
              <TabsTrigger value="products" className="data-[state=active]:bg-white">
                <Package className="h-4 w-4 mr-2" />
                Products
              </TabsTrigger>
              <TabsTrigger value="companies" className="data-[state=active]:bg-white">
                <Building2 className="h-4 w-4 mr-2" />
                Companies
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Products Table */}
          <TabsContent value="products" className="m-0">
            {products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No verified products yet</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Product</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead className="hidden md:table-cell">Company</TableHead>
                        <TableHead className="hidden lg:table-cell">Lot #</TableHead>
                        <TableHead className="hidden md:table-cell">Registered</TableHead>
                        <TableHead>Blockchain Tx</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.productName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                              {product.brandName}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-gray-600">
                            {product.companyName}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell font-mono text-sm text-gray-500">
                            {product.lotNumber}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-gray-500 text-sm">
                            {formatDate(product.registrationDate)}
                          </TableCell>
                          <TableCell>
                            <a
                              href={product.etherscanUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-mono"
                            >
                              {truncateHash(product.blockchainTxHash)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    Page {productPage} of {productTotalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                      disabled={productPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProductPage((p) => Math.min(productTotalPages, p + 1))}
                      disabled={productPage >= productTotalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Companies Table */}
          <TabsContent value="companies" className="m-0">
            {companies.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No verified companies yet</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Company</TableHead>
                        <TableHead className="hidden md:table-cell">License #</TableHead>
                        <TableHead className="hidden lg:table-cell">Address</TableHead>
                        <TableHead>Products</TableHead>
                        <TableHead>Blockchain Tx</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-blue-100 rounded">
                                <Building2 className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className="font-medium">{company.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-sm text-gray-500">
                            {company.licenseNumber}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-gray-600 text-sm max-w-[200px] truncate">
                            {company.address}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              {company.productCount} products
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <a
                              href={company.etherscanUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-mono"
                            >
                              {truncateHash(company.blockchainTxHash)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    Page {companyPage} of {companyTotalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCompanyPage((p) => Math.max(1, p - 1))}
                      disabled={companyPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCompanyPage((p) => Math.min(companyTotalPages, p + 1))}
                      disabled={companyPage >= companyTotalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Blockchain Trust Note */}
      <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6 border border-teal-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-teal-100 rounded-xl">
            <Shield className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Blockchain Verified</h4>
            <p className="text-sm text-gray-600">
              All records shown above are permanently stored on the Ethereum Sepolia blockchain. 
              Click any transaction hash to verify the record on Etherscan. This ensures complete 
              transparency and tamper-proof verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
