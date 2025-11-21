import { useState, useEffect } from "react";
import { Plus, Grid, List, Search, Download } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import type { Product } from "@/typeorm/entities/product.entity";
import { ProductCard } from "@/components/ProductCard";
import { AddProductModal } from "@/components/AddProductModal";
import { ProductDetailsModal } from "@/components/ProductDetailsModal";
import type { Company } from "@/typeorm/entities/company.entity";
import { PDFGenerationService } from "@/services/pdfGenerationService";
import { toast } from "react-toastify";

export interface ProductsProps {
  products?: Product[];
  companies?: Company[];
  onProductClick?: (product: Product) => void;
  onAddProduct?: () => void;
  loading?: boolean;
  onRefresh?: () => void;
}

export function Products(props: ProductsProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(props.loading || false);
  const [products, setProducts] = useState<Product[]>(props.products || []);
  const [pagination, setPagination] = useState<any | null>(null);
  const pageSize = 10;
  // Unified search term (server-side for both list & grid views)
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
    if (props.onProductClick) {
      props.onProductClick(product);
    }
  };

  const handleAddProduct = () => {
    setShowAddModal(true);
    if (props.onAddProduct) {
      props.onAddProduct();
    }
  };

  const handleAddSuccess = () => {
    // Refresh the product list after successful addition
    fetchProductsPage(currentPage);

    if (props.onRefresh) {
      props.onRefresh();
    }
  };

  // Handle PDF certificate download
  const handleDownloadCertificate = async (
    product: Product,
    event: React.MouseEvent
  ) => {
    event.stopPropagation(); // Prevent row click
    try {
      toast.info("Generating certificate PDF...", { autoClose: 1000 });
      await PDFGenerationService.generateAndDownloadProductCertificate(product);
      toast.success("Certificate downloaded successfully!");
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast.error("Failed to generate certificate. Please try again.");
    }
  };

  // Server-driven: fetch a page of products (uses current searchQuery state)
  const fetchProductsPage = async (page: number) => {
    setLoading(true);
    try {
      const resp = await (
        await import("@/services/productService")
      ).ProductService.getProductsPage(page, pageSize, searchQuery);
      const items = resp.products || resp.data || [];
      setProducts(items);
      setPagination(resp.pagination || null);
      setCurrentPage(Number(resp.pagination?.current_page) || page);
      // eslint-disable-next-line no-console
      console.debug("Products.fetchProductsPage response:", resp);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error fetching products page:", error);
    } finally {
      setLoading(false);
    }
  };

  // Column definitions for list view table
  const columns: Column[] = [
    { key: "brandName", label: "Brand Name" },
    { key: "productName", label: "Product Name" },
    { key: "lotNumber", label: "Lot Number" },
    {
      key: "expirationDate",
      label: "Expiration Date",
      render: (value: Date) =>
        new Date(value).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
    },
    {
      key: "company",
      label: "Company",
      render: (value: any) => value?.name || "N/A",
    },
    {
      key: "actions",
      label: "Actions",
      render: (_: any, row: Product) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleProductClick(row);
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

  // Initial load (or use provided products)
  useEffect(() => {
    if (props.products && props.products.length > 0) {
      setProducts(props.products);
    } else {
      fetchProductsPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.products]);

  useEffect(() => {
    if (!pagination && products.length === pageSize) {
      fetchProductsPage(currentPage || 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, pagination]);

  // Debounce search query changes (server-side fetch)
  useEffect(() => {
    const handle = setTimeout(() => {
      fetchProductsPage(1);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const totalItems = pagination?.total_items ?? products.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedProducts = products;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <PageContainer
      title="Products"
      description="Manage and view all registered products in the system."
    >
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button onClick={handleAddProduct}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        <div className="flex border rounded-lg">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="rounded-r-none"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "list" ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <DataTable
              title=""
              columns={columns}
              data={pagedProducts}
              searchPlaceholder="Search products..."
              onSearch={(v) => setSearchQuery(v)}
              loading={loading}
              emptyStateTitle="No Products Found"
              emptyStateDescription="Try adjusting your search or add a new product to get started."
            />
          </div>

          <div className="mt-4 flex items-center justify-between flex-shrink-0">
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
                onPageChange={(p: number) => fetchProductsPage(p)}
                showingPosition="right"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Search Input for Grid View */}
          <div className="flex items-center justify-between">
            <div></div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search products..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Grid Content Container */}
          <div className="bg-white rounded-lg">
            {pagedProducts && pagedProducts.length > 0 ? (
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pagedProducts.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      onClick={() => handleProductClick(product)}
                    />
                  ))}
                </div>
              </div>
            ) : !loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Products Found
                  </h3>
                  <p className="text-gray-500">
                    Try adjusting your search or add a new product to get
                    started.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

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
                onPageChange={(p: number) => fetchProductsPage(p)}
                showingPosition="right"
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
        companies={props.companies || []}
      />

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        product={selectedProduct}
      />
    </PageContainer>
  );
}
