import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Package, Search } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { Input } from "@/components/ui/input";
import { CompanyOwnerService } from "@/services/companyOwnerService";
import { ProductService } from "@/services/productService";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "react-toastify";
import type { Product } from "@/typeorm/entities/product.entity";

export function CompanyProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyOwner, setCompanyOwner] = useState<any>(null);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    const isLoggedIn = CompanyOwnerService.isCompanyOwnerLoggedIn();
    
    if (!isLoggedIn) {
      navigate("/company/login");
      return;
    }

    const ownerData = CompanyOwnerService.getCompanyOwnerData();
    if (!ownerData) {
      navigate("/company/login");
      return;
    }

    setCompanyOwner(ownerData);
    await fetchProducts();
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await ProductService.getAllProducts();
      setProducts(response?.products || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const columns: Column[] = [
    {
      key: "productName",
      label: "Product Name",
      sortable: true,
    },
    {
      key: "brandName",
      label: "Brand Name",
      sortable: true,
    },
    {
      key: "lotNumber",
      label: "Lot Number",
    },
    {
      key: "productClassification",
      label: "Classification",
    },
    {
      key: "expirationDate",
      label: "Expiration Date",
      render: (value: string | Date) => {
        if (!value) return "N/A";
        try {
          const date = new Date(value);
          if (isNaN(date.getTime())) return "Invalid Date";
          return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } catch (error) {
          return "Invalid Date";
        }
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row: Product) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails(row);
            }}
          >
            View Details
          </Button>
        </div>
      ),
    },
  ];

  const handleViewDetails = (_product: Product) => {
    // Navigate to product details or show modal
    toast.info("Product details view coming soon!");
  };

  const handleAddProduct = () => {
    toast.info("Add product functionality coming soon!");
  };

  const filteredProducts = products.filter((product) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      product.productName?.toLowerCase().includes(searchLower) ||
      product.brandName?.toLowerCase().includes(searchLower) ||
      product.lotNumber?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <PageContainer title="Products">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Company Products"
      description="Manage your product catalog and certificates"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {companyOwner?.companyName} - Products
            </h1>
            <p className="text-sm text-gray-500">
              Total: {filteredProducts.length} products
            </p>
          </div>
        </div>
        <Button
          onClick={handleAddProduct}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Package className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Products Yet
          </h3>
          <p className="text-gray-600 mb-6">
            Start by adding your first product to the catalog
          </p>
          <Button
            onClick={handleAddProduct}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      ) : (
        <DataTable
          title="Product Catalog"
          columns={columns}
          data={filteredProducts}
          searchPlaceholder="Search products..."
          onSearch={setSearchQuery}
          loading={loading}
          emptyStateTitle="No Products Found"
          emptyStateDescription="Try adjusting your search query"
        />
      )}
    </PageContainer>
  );
}
