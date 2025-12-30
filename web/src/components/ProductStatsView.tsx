import { useState, useEffect } from "react";
import { Tag, Layers, Package, ChevronRight, ChevronDown, Trash2, Edit2, RefreshCw, AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandNameService, type BrandNameStats } from "@/services/brandNameService";
import { ProductClassificationService, type ClassificationStats } from "@/services/productClassificationService";
import type { Product } from "@/typeorm/entities/product.entity";
import { toast } from "react-toastify";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProductDetailsModal } from "@/components/ProductDetailsModal";

type TabType = "brand" | "classification";

// Use the stats types from the service
type BrandNameStat = BrandNameStats;

interface ClassificationStat extends ClassificationStats {
  children?: ClassificationStat[];
}

export function ProductStatsView() {
  const [activeTab, setActiveTab] = useState<TabType>("brand");
  const [brandNames, setBrandNames] = useState<BrandNameStat[]>([]);
  const [classifications, setClassifications] = useState<ClassificationStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedClassifications, setExpandedClassifications] = useState<Set<string>>(new Set());
  
  // Products view state
  const [selectedBrand, setSelectedBrand] = useState<BrandNameStat | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<ClassificationStat | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  
  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BrandNameStat | ClassificationStat | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<BrandNameStat | ClassificationStat | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [rerouteTarget, setRerouteTarget] = useState<string>("");
  const [requiresRerouting, setRequiresRerouting] = useState(false);
  const [deleteProductCount, setDeleteProductCount] = useState(0);
  
  // Product details modal state
  const [productDetailsOpen, setProductDetailsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Fetch brand names with stats
  const fetchBrandNames = async () => {
    setLoading(true);
    try {
      const response = await BrandNameService.getBrandNameStats();
      setBrandNames(response.data || []);
    } catch (error) {
      console.error("Error fetching brand names:", error);
      toast.error("Failed to load brand names");
    } finally {
      setLoading(false);
    }
  };

  // Fetch classifications with stats
  const fetchClassifications = async () => {
    setLoading(true);
    try {
      const response = await ProductClassificationService.getClassificationStats();
      // Convert subClassifications to children for tree rendering
      const mappedClassifications: ClassificationStat[] = (response.data || []).map((c) => ({
        ...c,
        children: c.subClassifications?.map((sub) => ({
          _id: sub._id,
          name: sub.name,
          productCount: sub.productCount,
          description: undefined,
          subClassifications: [],
          totalSubClassificationProducts: 0,
        })) || [],
      }));
      setClassifications(mappedClassifications);
    } catch (error) {
      console.error("Error fetching classifications:", error);
      toast.error("Failed to load classifications");
    } finally {
      setLoading(false);
    }
  };

  // Fetch products by brand name
  const fetchProductsByBrand = async (brandId: string) => {
    setProductsLoading(true);
    try {
      const response = await BrandNameService.getProductsByBrandName(brandId);
      setProducts(response.data || []);
    } catch (error) {
      console.error("Error fetching products by brand:", error);
      toast.error("Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  };

  // Fetch products by classification
  const fetchProductsByClassification = async (classificationId: string) => {
    setProductsLoading(true);
    try {
      const response = await ProductClassificationService.getProductsByClassification(classificationId);
      setProducts(response.data || []);
    } catch (error) {
      console.error("Error fetching products by classification:", error);
      toast.error("Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "brand") {
      fetchBrandNames();
    } else {
      fetchClassifications();
    }
    // Reset selections when switching tabs
    setSelectedBrand(null);
    setSelectedClassification(null);
    setProducts([]);
  }, [activeTab]);

  // Handle brand name click
  const handleBrandClick = (brand: BrandNameStat) => {
    setSelectedBrand(brand);
    setSelectedClassification(null);
    fetchProductsByBrand(brand._id);
  };

  // Handle classification click
  const handleClassificationClick = (classification: ClassificationStat) => {
    setSelectedClassification(classification);
    setSelectedBrand(null);
    fetchProductsByClassification(classification._id);
  };

  // Toggle classification expansion (to show children)
  const toggleClassificationExpand = (classificationId: string) => {
    const newExpanded = new Set(expandedClassifications);
    if (newExpanded.has(classificationId)) {
      newExpanded.delete(classificationId);
    } else {
      newExpanded.add(classificationId);
    }
    setExpandedClassifications(newExpanded);
  };

  // Open edit modal
  const handleEdit = (item: BrandNameStat | ClassificationStat) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDescription(item.description || "");
    setEditModalOpen(true);
  };

  // Submit edit
  const handleEditSubmit = async () => {
    if (!editingItem) return;
    setEditLoading(true);
    try {
      if (activeTab === "brand") {
        await BrandNameService.updateBrandName(editingItem._id, {
          name: editName,
          description: editDescription,
        });
        toast.success("Brand name updated successfully");
        fetchBrandNames();
      } else {
        await ProductClassificationService.updateClassification(editingItem._id, {
          name: editName,
          description: editDescription,
        });
        toast.success("Classification updated successfully");
        fetchClassifications();
      }
      setEditModalOpen(false);
      setEditingItem(null);
    } catch (error: any) {
      console.error("Error updating:", error);
      toast.error(error.response?.data?.message || "Failed to update");
    } finally {
      setEditLoading(false);
    }
  };

  // Open delete modal - check if rerouting is required
  const handleDelete = async (item: BrandNameStat | ClassificationStat) => {
    setDeletingItem(item);
    setRerouteTarget("");
    setRequiresRerouting(false);
    setDeleteProductCount(0);
    
    // Check if item has products that need rerouting
    const productCount = item.productCount || 0;
    if (productCount > 0) {
      setRequiresRerouting(true);
      setDeleteProductCount(productCount);
    }
    
    // For classifications, also check if it has children
    if (activeTab === "classification") {
      const classification = item as ClassificationStat;
      if (classification.children && classification.children.length > 0) {
        toast.error("Cannot delete classification with sub-classifications. Delete sub-classifications first.");
        return;
      }
    }
    
    setDeleteModalOpen(true);
  };

  // Submit delete
  const handleDeleteSubmit = async () => {
    if (!deletingItem) return;
    setDeleteLoading(true);
    try {
      if (activeTab === "brand") {
        await BrandNameService.deleteBrandName(
          deletingItem._id,
          requiresRerouting ? { newBrandNameId: rerouteTarget, confirm: true } : undefined
        );
        toast.success("Brand name deleted successfully");
        fetchBrandNames();
        if (selectedBrand?._id === deletingItem._id) {
          setSelectedBrand(null);
          setProducts([]);
        }
      } else {
        await ProductClassificationService.deleteClassification(
          deletingItem._id,
          requiresRerouting ? { newClassificationId: rerouteTarget, confirm: true } : undefined
        );
        toast.success("Classification deleted successfully");
        fetchClassifications();
        if (selectedClassification?._id === deletingItem._id) {
          setSelectedClassification(null);
          setProducts([]);
        }
      }
      setDeleteModalOpen(false);
      setDeletingItem(null);
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error(error.response?.data?.message || "Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Get available reroute targets (excluding the item being deleted)
  const getAvailableRerouteTargets = () => {
    if (activeTab === "brand") {
      return brandNames.filter(b => b._id !== deletingItem?._id);
    } else {
      // Flatten classifications for dropdown
      const flattenClassifications = (items: ClassificationStat[]): ClassificationStat[] => {
        const result: ClassificationStat[] = [];
        items.forEach(item => {
          if (item._id !== deletingItem?._id) {
            result.push(item);
            if (item.children) {
              result.push(...flattenClassifications(item.children).filter(c => c._id !== deletingItem?._id));
            }
          }
        });
        return result;
      };
      return flattenClassifications(classifications);
    }
  };

  // Recursive render for classification tree
  const renderClassificationTree = (items: ClassificationStat[], level = 0) => {
    return items.map((classification) => {
      const hasChildren = classification.children && classification.children.length > 0;
      const isExpanded = expandedClassifications.has(classification._id);
      const isSelected = selectedClassification?._id === classification._id;

      return (
        <div key={classification._id}>
          <div
            className={`flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b ${
              isSelected ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
            }`}
            style={{ paddingLeft: `${12 + level * 20}px` }}
          >
            <div className="flex items-center flex-1" onClick={() => handleClassificationClick(classification)}>
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleClassificationExpand(classification._id);
                  }}
                  className="mr-2 p-1 hover:bg-gray-200 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              {!hasChildren && <div className="w-7" />}
              <Layers className="h-4 w-4 mr-2 text-gray-400" />
              <span className="font-medium">{classification.name}</span>
              {level > 0 && (
                <span className="ml-2 text-xs text-gray-400">(Sub)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {classification.productCount || 0} products
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(classification);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(classification);
                }}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {hasChildren && isExpanded && (
            <div>
              {renderClassificationTree(classification.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("brand")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "brand"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Tag className="h-4 w-4 inline-block mr-2" />
          Brand Names
        </button>
        <button
          onClick={() => setActiveTab("classification")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "classification"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Layers className="h-4 w-4 inline-block mr-2" />
          Classifications
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: List of Brand Names or Classifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">
              {activeTab === "brand" ? "Brand Names" : "Product Classifications"}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => activeTab === "brand" ? fetchBrandNames() : fetchClassifications()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : activeTab === "brand" ? (
              brandNames.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Tag className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  No brand names found. Add brand names when creating products.
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  {brandNames.map((brand) => (
                    <div
                      key={brand._id}
                      className={`flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b ${
                        selectedBrand?._id === brand._id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                      }`}
                      onClick={() => handleBrandClick(brand)}
                    >
                      <div className="flex items-center">
                        <Tag className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">{brand.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {brand.productCount || 0} products
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(brand);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(brand);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : classifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Layers className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                No classifications found. Add classifications when creating products.
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {renderClassificationTree(classifications)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Products List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {selectedBrand
                ? `Products: ${selectedBrand.name}`
                : selectedClassification
                ? `Products: ${selectedClassification.name}`
                : "Select to View Products"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {productsLoading ? (
              <div className="p-8 text-center text-gray-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                Loading products...
              </div>
            ) : !selectedBrand && !selectedClassification ? (
              <div className="p-8 text-center text-gray-500">
                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                Click on a {activeTab === "brand" ? "brand name" : "classification"} to view its products.
              </div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                No products found for this {activeTab === "brand" ? "brand" : "classification"}.
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {products.map((product) => (
                  <div
                    key={product._id}
                    className="flex items-center justify-between p-3 border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedProduct(product);
                      setProductDetailsOpen(true);
                    }}
                  >
                    <div>
                      <div className="font-medium">{product.productName}</div>
                      <div className="text-sm text-gray-500">
                        {product.brandName} • Lot: {product.lotNumber}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">
                        {new Date(product.expirationDate).toLocaleDateString()}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(product);
                          setProductDetailsOpen(true);
                        }}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {activeTab === "brand" ? "Brand Name" : "Classification"}
            </DialogTitle>
            <DialogDescription>
              Update the {activeTab === "brand" ? "brand name" : "classification"} details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter description (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={editLoading}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={editLoading || !editName.trim()}>
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={productDetailsOpen}
        onClose={() => {
          setProductDetailsOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
      />

      {/* Delete Modal with Rerouting */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete {activeTab === "brand" ? "Brand Name" : "Classification"}
            </DialogTitle>
            <DialogDescription>
              {requiresRerouting ? (
                <span>
                  This {activeTab === "brand" ? "brand name" : "classification"} has{" "}
                  <strong>{deleteProductCount}</strong> products associated with it. 
                  You must select a new {activeTab === "brand" ? "brand name" : "classification"} to reassign these products before deleting.
                </span>
              ) : (
                <span>
                  Are you sure you want to delete "<strong>{deletingItem?.name}</strong>"? 
                  This action cannot be undone.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {requiresRerouting && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Reassign Products To</Label>
                <Select value={rerouteTarget} onValueChange={setRerouteTarget}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select a ${activeTab === "brand" ? "brand name" : "classification"}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableRerouteTargets().map((target) => (
                      <SelectItem key={target._id} value={target._id}>
                        {target.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  All {deleteProductCount} products will be moved to the selected {activeTab === "brand" ? "brand name" : "classification"}.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubmit}
              disabled={deleteLoading || (requiresRerouting && !rerouteTarget)}
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
