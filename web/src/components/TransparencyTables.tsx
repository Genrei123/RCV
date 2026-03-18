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
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ExternalLink,
  Package,
  Building2,
  Loader2,
  Search,
} from 'lucide-react';
import { Pagination as SimplePagination } from '@/components/Pagination';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  PublicService,
  type PublicProduct,
  type PublicCompany,
  type PublicStats,
} from '@/services/publicService';
import CertificateTimelineModal from '@/components/CertificateTimelineModal';
import CompanyDetailsPublicModal from '@/components/CompanyDetailsPublicModal';

export function TransparencyTables() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'companies'>('products');
  const [productPage, setProductPage] = useState(1);
  const [companyPage, setCompanyPage] = useState(1);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const [companyTotalPages, setCompanyTotalPages] = useState(1);
  const [productTotalItems, setProductTotalItems] = useState(0);
  const [companyTotalItems, setCompanyTotalItems] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');

  const fetchData = async () => {
    const isInitialLoad = !stats;
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setPaginationLoading(true);
    }
    try {
      const [productsRes, companiesRes, statsRes] = await Promise.all([
        PublicService.getVerifiedProducts(productPage, 10),
        PublicService.getVerifiedCompanies(companyPage, 10),
        PublicService.getStats(),
      ]);
      setProducts(productsRes.data);
      setProductTotalPages(productsRes.pagination.total_pages);
      setProductTotalItems(productsRes.pagination.total_items ?? productsRes.data.length);
      setCompanies(companiesRes.data);
      setCompanyTotalPages(companiesRes.pagination.total_pages);
      setCompanyTotalItems(companiesRes.pagination.total_items ?? companiesRes.data.length);
      setStats(statsRes);
    } catch (error) {
      console.error('Failed to fetch public data:', error);
    } finally {
      setLoading(false);
      setPaginationLoading(false);
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

  const handleProductClick = (product: PublicProduct) => {
    setSelectedProduct({ id: product.id, name: product.productName });
    setIsTimelineModalOpen(true);
  };

  const handleCompanyClick = (company: PublicCompany) => {
    setSelectedCompany({ id: company.id, name: company.name });
    setIsCompanyModalOpen(true);
  };

  const handleProductPageChange = (page: number) => {
    if (page === productPage) return;
    setPaginationLoading(true);
    setProductPage(page);
  };

  const handleCompanyPageChange = (page: number) => {
    if (page === companyPage) return;
    setPaginationLoading(true);
    setCompanyPage(page);
  };

  // Filter products based on search query
  const filteredProducts = products.filter((product) => {
    if (!productSearchQuery) return true;
    const query = productSearchQuery.toLowerCase();
    return (
      product.productName.toLowerCase().includes(query) ||
      product.brandName.toLowerCase().includes(query) ||
      product.companyName.toLowerCase().includes(query) ||
      product.lotNumber?.toLowerCase().includes(query) ||
      product.classification?.toLowerCase().includes(query)
    );
  });

  // Filter companies based on search query
  const filteredCompanies = companies.filter((company) => {
    if (!companySearchQuery) return true;
    const query = companySearchQuery.toLowerCase();
    return (
      company.name.toLowerCase().includes(query) ||
      company.licenseNumber?.toLowerCase().includes(query) ||
      company.address?.toLowerCase().includes(query) ||
      company.businessType?.toLowerCase().includes(query)
    );
  });

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-2 text-gray-600">Loading verified records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-6">
      {/* Tables with Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'products' | 'companies')}>
          <div className="border-b border-gray-200 px-6 pt-6 pb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
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
              
              {/* Search Input */}
              <div className="relative w-full sm:w-auto sm:min-w-[300px] lg:min-w-[400px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder={activeTab === 'products' 
                    ? "Search products..." 
                    : "Search companies..."}
                  value={activeTab === 'products' ? productSearchQuery : companySearchQuery}
                  onChange={(e) => activeTab === 'products' 
                    ? setProductSearchQuery(e.target.value)
                    : setCompanySearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {/* Search Results Count */}
            {activeTab === 'products' && productSearchQuery && (
              <p className="text-sm text-gray-500 mt-3">
                Found {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              </p>
            )}
            {activeTab === 'companies' && companySearchQuery && (
              <p className="text-sm text-gray-500 mt-3">
                Found {filteredCompanies.length} compan{filteredCompanies.length !== 1 ? 'ies' : 'y'}
              </p>
            )}
          </div>

          {/* Products Table */}
          <TabsContent value="products" className="m-0">
            {products.length === 0 ? (
              <div className="text-center py-16 px-6">
                <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No verified products yet</p>
              </div>
            ) : (
              <>
                <div className="relative overflow-x-auto px-6 py-4">
                  {paginationLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                      <LoadingSpinner />
                    </div>
                  )}
                  <div className={paginationLoading ? 'opacity-50 pointer-events-none' : ''}>
                    <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="py-4 px-4">Product</TableHead>
                        <TableHead className="py-4 px-4">Brand</TableHead>
                        <TableHead className="hidden md:table-cell py-4 px-4">Company</TableHead>
                        <TableHead className="hidden lg:table-cell py-4 px-4">Lot #</TableHead>
                        <TableHead className="hidden md:table-cell py-4 px-4">Registered</TableHead>
                        <TableHead className="py-4 px-4">Blockchain Tx</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-16 px-6">
                            <Search className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">No products match your search</p>
                            <p className="text-sm text-gray-400 mt-1">Try different keywords</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((product) => (
                          <TableRow 
                            key={product.id}
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleProductClick(product)}
                          >
                            <TableCell className="font-medium py-4 px-4">
                            {product.productName}
                          </TableCell>
                          <TableCell className="py-4 px-4">
                            <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                              {product.brandName}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-gray-600 py-4 px-4">
                            {product.companyName}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell font-mono text-sm text-gray-500 py-4 px-4">
                            {product.lotNumber}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-gray-500 text-sm py-4 px-4">
                            {formatDate(product.registrationDate)}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()} className="py-4 px-4">
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
                      ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </div>
                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between w-full px-6 py-4 border-t border-gray-200">
                  <div className="text-sm text-muted-foreground">
                    Showing {products.length} of {productTotalItems} products • Page {productPage} of {productTotalPages}
                  </div>

                  <div>
                    <SimplePagination
                      currentPage={productPage}
                      totalPages={productTotalPages}
                      totalItems={productTotalItems}
                      itemsPerPage={10}
                      onPageChange={handleProductPageChange}
                      alwaysShowControls
                      showingText={null}
                    />
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Companies Table */}
          <TabsContent value="companies" className="m-0">
            {companies.length === 0 ? (
              <div className="text-center py-16 px-6">
                <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No verified companies yet</p>
              </div>
            ) : (
              <>
                <div className="relative overflow-x-auto px-6 py-4">
                  {paginationLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                      <LoadingSpinner />
                    </div>
                  )}
                  <div className={paginationLoading ? 'opacity-50 pointer-events-none' : ''}>
                    <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="py-4 px-4">Company</TableHead>
                        <TableHead className="hidden md:table-cell py-4 px-4">License #</TableHead>
                        <TableHead className="hidden lg:table-cell py-4 px-4">Address</TableHead>
                        <TableHead className="py-4 px-4">Products</TableHead>
                        <TableHead className="py-4 px-4">Blockchain Tx</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompanies.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-16 px-6">
                            <Search className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">No companies match your search</p>
                            <p className="text-sm text-gray-400 mt-1">Try different keywords</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCompanies.map((company) => (
                          <TableRow 
                            key={company.id}
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleCompanyClick(company)}
                          >
                            <TableCell className="py-4 px-4">
                              <span className="font-medium">{company.name}</span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell font-mono text-sm text-gray-500 py-4 px-4">
                              {company.licenseNumber}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-gray-600 text-sm max-w-[200px] truncate py-4 px-4">
                              {company.address}
                            </TableCell>
                            <TableCell className="py-4 px-4">
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                {company.productCount} products
                              </Badge>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()} className="py-4 px-4">
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
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </div>
                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between w-full px-6 py-4 border-t border-gray-200">
                  <div className="text-sm text-muted-foreground">
                    Showing {companies.length} of {companyTotalItems} companies • Page {companyPage} of {companyTotalPages}
                  </div>

                  <div>
                    <SimplePagination
                      currentPage={companyPage}
                      totalPages={companyTotalPages}
                      totalItems={companyTotalItems}
                      itemsPerPage={10}
                      onPageChange={handleCompanyPageChange}
                      alwaysShowControls
                      showingText={null}
                    />
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedProduct && (
        <CertificateTimelineModal
          isOpen={isTimelineModalOpen}
          onClose={() => {
            setIsTimelineModalOpen(false);
            setSelectedProduct(null);
          }}
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          isPublic={true}
        />
      )}

      {/* Company Details Modal */}
      {selectedCompany && (
        <CompanyDetailsPublicModal
          isOpen={isCompanyModalOpen}
          onClose={() => {
            setIsCompanyModalOpen(false);
            setSelectedCompany(null);
          }}
          companyId={selectedCompany.id}
          companyName={selectedCompany.name}
        />
      )}
    </div>
  );
}
