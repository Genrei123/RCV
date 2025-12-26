import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Package } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { CompanyOwnerService } from "@/services/companyOwnerService";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { MapComponent, type Inspector } from "@/components/MapComponent";
import { ProductService } from "@/services/productService";

export function CompanyMaps() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [companyOwner, setCompanyOwner] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);

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
    await fetchProductsAndLocations();
    setLoading(false);
  };

  const fetchProductsAndLocations = async () => {
    try {
      const response = await ProductService.getAllProducts();
      const allProducts = response?.products || [];
      setProducts(allProducts);

      // Convert products with locations to map markers
      const productMarkers: Inspector[] = allProducts
        .filter((product: any) => product.latitude && product.longitude)
        .map((product: any) => ({
          id: product._id,
          name: product.productName || "Unknown Product",
          role: product.brandName || "Product",
          status: "active" as const,
          lastSeen: product.updatedAt,
          badgeId: product.lotNumber,
          location: {
            lat: parseFloat(product.latitude),
            lng: parseFloat(product.longitude),
            address: product.location || `${product.latitude}, ${product.longitude}`,
            city: product.brandName || "Product Location",
          },
        }));

      setInspectors(productMarkers);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleMarkerClick = (inspector: Inspector) => {
    console.log("Product clicked:", inspector);
    // You can navigate to product details or show more info
  };

  if (loading) {
    return (
      <PageContainer title="Maps">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Company Maps"
      description="View product locations and distribution for your company"
      maxWidth="full"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {companyOwner?.companyName} - Maps
            </h1>
            <p className="text-sm text-gray-500">
              Product locations and distribution tracking
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Package className="h-4 w-4" />
          <span>{inspectors.length} products with locations</span>
        </div>
      </div>

      {/* Company Location Card */}
      <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Company Headquarters
              </h4>
              <div className="space-y-2 text-sm text-blue-700">
                <p>
                  <span className="font-medium">Latitude:</span> {companyOwner?.latitude || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Longitude:</span> {companyOwner?.longitude || "N/A"}
                </p>
                {companyOwner?.address && (
                  <p>
                    <span className="font-medium">Address:</span> {companyOwner.address}
                  </p>
                )}
              </div>
            </div>

            <div className="border-l-2 border-blue-300 pl-6">
              <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Distribution Statistics
              </h4>
              <div className="space-y-2 text-sm text-purple-700">
                <p>Total Products: {products.length}</p>
                <p>Products with Locations: {inspectors.length}</p>
                <p>Coverage: {products.length > 0 ? Math.round((inspectors.length / products.length) * 100) : 0}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map Container */}
      <Card className="border-2 border-gray-200 overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[600px]">
            <MapComponent
              inspectors={inspectors}
              onInspectorClick={handleMarkerClick}
              loading={loading}
              allInspectors={inspectors}
            />
          </div>
        </CardContent>
      </Card>

      {/* Map Legend */}
      <Card className="mt-6 border-2 border-gray-200">
        <CardContent className="p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Map Legend</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">Active Products</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700">Product Locations</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
              <span className="text-gray-700">Distribution Centers</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
