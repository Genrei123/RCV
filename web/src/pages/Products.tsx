import { useState, useEffect } from "react";
import { Plus, Grid, List, Search, Download } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/DataTable";
import { truncateText } from "@/utils/textTruncate";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
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
    {
      key: "brandName",
      label: "Brand Name",
      render: (value: string) => (
        <span title={value}>{truncateText(value)}</span>
      ),
    },
    {
      key: "productName",
      label: "Product Name",
      render: (value: string) => (
        <span title={value}>{truncateText(value)}</span>
      ),
    },
    {
      key: "lotNumber",
      label: "Lot Number",
      render: (value: string) => (
        <span title={value}>{truncateText(value)}</span>
      ),
    },
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
      render: (value: any) => {
        const companyName = value?.name || "N/A";
        return <span title={companyName}>{truncateText(companyName)}</span>;
      },
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
            className="app-text-primary hover:app-text-primary hover:app-bg-primary-soft"
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
      {/* Header Actions: right-aligned toggles (hidden on mobile in grid view) */}
      <div className="flex flex-col md:flex-row md:items-center justify-end mb-6">
        <div
          className={`flex border rounded-lg self-end ${
            viewMode === "grid" ? "hidden sm:flex" : ""
          }`}
        >
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="rounded-r-none cursor-pointer"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="rounded-l-none cursor-pointer"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "list" ? (
        <>
          <DataTable
            title="Product List"
            columns={columns}
            data={pagedProducts}
            searchPlaceholder="Search products..."
            onSearch={(v) => setSearchQuery(v)}
            loading={loading}
            emptyStateTitle="No Products Found"
            emptyStateDescription="Try adjusting your search or add a new product to get started."
            customControls={
              <Button onClick={handleAddProduct} className="whitespace-nowrap cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            }
          />

          <div className="mt-4 flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              Showing {pagedProducts.length} of {totalItems} products • Page{" "}
              {currentPage} of {totalPages}
            </div>

            <Pagination className="mx-0 w-auto">
              <PaginationContent className="gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      currentPage > 1 && fetchProductsPage(currentPage - 1)
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
                      onClick={() => fetchProductsPage(1)}
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
                      onClick={() => fetchProductsPage(currentPage - 1)}
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
                      onClick={() => fetchProductsPage(currentPage + 1)}
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
                      onClick={() => fetchProductsPage(totalPages)}
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
                      fetchProductsPage(currentPage + 1)
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
      ) : (
        <div className="space-y-6">
          <div className="flex flex-row flex-nowrap items-center justify-end gap-2 sm:gap-3">
            {/* Mobile: flexible width; Desktop: fixed width */}
            <div className="relative flex-1 sm:flex-none max-w-[70%] min-w-[140px] sm:max-w-none sm:w-64 group rounded-md border border-gray-300 focus-within:border-black transition-colors flex items-center h-10">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-black transition-colors" />
              <Input
                type="text"
                placeholder="Search products..."
                className="pl-10 border-0 bg-white text-gray-800 focus:text-black placeholder:text-gray-400 focus:placeholder:text-gray-500 h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center shrink-0">
              <Button
                onClick={handleAddProduct}
                className="whitespace-nowrap sm:ml-2 cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
            {/* Mobile toggle group (shown only in grid view) */}
            {viewMode === "grid" && (
              <div className="flex border rounded-lg sm:hidden shrink-0">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
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
