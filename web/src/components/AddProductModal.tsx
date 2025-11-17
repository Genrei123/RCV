import { useState } from "react";
import { X, Package, Hash, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductService } from "@/services/productService";
import type { CreateProductRequest } from "@/services/productService";
import { toast } from "react-toastify";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companies: Array<{ _id: string; name: string }>;
}

export function AddProductModal({
  isOpen,
  onClose,
  onSuccess,
  companies,
}: AddProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    LTONumber: "",
    CFPRNumber: "",
    lotNumber: "",
    brandName: "",
    productName: "",
    productClassification: "",
    productSubClassification: "",
    expirationDate: "",
    dateOfRegistration: new Date().toISOString().split("T")[0],
    companyId: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.LTONumber.trim()) {
      newErrors.LTONumber = "LTO Number is required";
    }

    if (!formData.CFPRNumber.trim()) {
      newErrors.CFPRNumber = "CFPR Number is required";
    }

    if (!formData.lotNumber.trim()) {
      newErrors.lotNumber = "Lot Number is required";
    }

    if (!formData.brandName.trim()) {
      newErrors.brandName = "Brand Name is required";
    }

    if (!formData.productName.trim()) {
      newErrors.productName = "Product Name is required";
    }

    if (!formData.productClassification.trim()) {
      newErrors.productClassification = "Product Classification is required";
    }

    if (!formData.productSubClassification.trim()) {
      newErrors.productSubClassification =
        "Product Sub-Classification is required";
    }

    if (!formData.expirationDate) {
      newErrors.expirationDate = "Expiration Date is required";
    }

    if (!formData.companyId) {
      newErrors.companyId = "Company is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      // The JWT token is automatically included in the request via axios interceptor
      // The backend will extract the user from the JWT token
      const productData: CreateProductRequest = {
        LTONumber: formData.LTONumber,
        CFPRNumber: formData.CFPRNumber,
        lotNumber: formData.lotNumber,
        brandName: formData.brandName,
        productName: formData.productName,
        productClassification: formData.productClassification,
        productSubClassification: formData.productSubClassification,
        expirationDate: new Date(formData.expirationDate),
        dateOfRegistration: new Date(formData.dateOfRegistration),
        companyId: formData.companyId,
      };

      const response = await ProductService.addProduct(productData);

      // Show success message with who registered it
      toast.success(
        `Product created successfully by ${response.registeredBy.name}!`
      );

      console.log("Product registered by:", response.registeredBy);

      // Reset form
      setFormData({
        LTONumber: "",
        CFPRNumber: "",
        lotNumber: "",
        brandName: "",
        productName: "",
        productClassification: "",
        productSubClassification: "",
        expirationDate: "",
        dateOfRegistration: new Date().toISOString().split("T")[0],
        companyId: "",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating product:", error);
      const errorMessage =
        error.message ||
        error.response?.data?.message ||
        "Failed to create product. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        LTONumber: "",
        CFPRNumber: "",
        lotNumber: "",
        brandName: "",
        productName: "",
        productClassification: "",
        productSubClassification: "",
        expirationDate: "",
        dateOfRegistration: new Date().toISOString().split("T")[0],
        companyId: "",
      });
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 app-bg-primary-soft rounded-lg">
              <Package className="h-5 w-5 app-text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold app-text">Add New Product</h2>
              <p className="text-sm app-text-subtle">
                Register a new product in the system
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:app-bg-neutral rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 app-text-subtle" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* LTO and CFPR Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium app-text-subtle mb-2">
                  LTO Number *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                  <Input
                    name="LTONumber"
                    value={formData.LTONumber}
                    onChange={handleChange}
                    placeholder="LTO-12345678"
                    className={`pl-10 ${
                      errors.LTONumber ? "border-[color:var(--app-error)]" : ""
                    }`}
                    disabled={loading}
                  />
                </div>
                {errors.LTONumber && (
                  <p className="app-text-error text-xs mt-1">
                    {errors.LTONumber}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium app-text-subtle mb-2">
                  CFPR Number *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                  <Input
                    name="CFPRNumber"
                    value={formData.CFPRNumber}
                    onChange={handleChange}
                    placeholder="CFPR-1234567"
                    className={`pl-10 ${
                      errors.CFPRNumber ? "border-[color:var(--app-error)]" : ""
                    }`}
                    disabled={loading}
                  />
                </div>
                {errors.CFPRNumber && (
                  <p className="app-text-error text-xs mt-1">
                    {errors.CFPRNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Lot Number */}
            <div>
              <label className="block text-sm font-medium app-text-subtle mb-2">
                Lot Number *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                <Input
                  name="lotNumber"
                  value={formData.lotNumber}
                  onChange={handleChange}
                  placeholder="Enter lot number"
                  className={`pl-10 ${
                    errors.lotNumber ? "border-[color:var(--app-error)]" : ""
                  }`}
                  disabled={loading}
                />
              </div>
              {errors.lotNumber && (
                <p className="app-text-error text-xs mt-1">
                  {errors.lotNumber}
                </p>
              )}
            </div>

            {/* Brand and Product Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium app-text-subtle mb-2">
                  Brand Name *
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                  <Input
                    name="brandName"
                    value={formData.brandName}
                    onChange={handleChange}
                    placeholder="Enter brand name"
                    className={`pl-10 ${
                      errors.brandName ? "border-[color:var(--app-error)]" : ""
                    }`}
                    disabled={loading}
                  />
                </div>
                {errors.brandName && (
                  <p className="app-text-error text-xs mt-1">
                    {errors.brandName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium app-text-subtle mb-2">
                  Product Name *
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                  <Input
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    placeholder="Enter product name"
                    className={`pl-10 ${
                      errors.productName
                        ? "border-[color:var(--app-error)]"
                        : ""
                    }`}
                    disabled={loading}
                  />
                </div>
                {errors.productName && (
                  <p className="app-text-error text-xs mt-1">
                    {errors.productName}
                  </p>
                )}
              </div>
            </div>

            {/* Classifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium app-text-subtle mb-2">
                  Product Classification *
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                  <Input
                    name="productClassification"
                    value={formData.productClassification}
                    onChange={handleChange}
                    placeholder="e.g., Raw Product, Processed Product"
                    className={`pl-10 ${
                      errors.productClassification
                        ? "border-[color:var(--app-error)]"
                        : ""
                    }`}
                    disabled={loading}
                  />
                </div>
                {errors.productClassification && (
                  <p className="app-text-error text-xs mt-1">
                    {errors.productClassification}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium app-text-subtle mb-2">
                  Product Sub-Classification *
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                  <Input
                    name="productSubClassification"
                    value={formData.productSubClassification}
                    onChange={handleChange}
                    placeholder="e.g., Layer Feeds, Gamecock Feeds"
                    className={`pl-10 ${
                      errors.productSubClassification
                        ? "border-[color:var(--app-error)]"
                        : ""
                    }`}
                    disabled={loading}
                  />
                </div>
                {errors.productSubClassification && (
                  <p className="app-text-error text-xs mt-1">
                    {errors.productSubClassification}
                  </p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium app-text-subtle mb-2">
                  Date of Registration *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                  <Input
                    type="date"
                    name="dateOfRegistration"
                    value={formData.dateOfRegistration}
                    onChange={handleChange}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium app-text-subtle mb-2">
                  Expiration Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                  <Input
                    type="date"
                    name="expirationDate"
                    value={formData.expirationDate}
                    onChange={handleChange}
                    className={`pl-10 ${
                      errors.expirationDate
                        ? "border-[color:var(--app-error)]"
                        : ""
                    }`}
                    disabled={loading}
                  />
                </div>
                {errors.expirationDate && (
                  <p className="app-text-error text-xs mt-1">
                    {errors.expirationDate}
                  </p>
                )}
              </div>
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium app-text-subtle mb-2">
                Company *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                <select
                  name="companyId"
                  value={formData.companyId}
                  onChange={handleChange}
                  className={`w-full pl-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[color:var(--app-primary)] ${
                    errors.companyId
                      ? "border-[color:var(--app-error)]"
                      : "app-border-neutral"
                  }`}
                  disabled={loading}
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company._id} value={company._id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.companyId && (
                <p className="app-text-error text-xs mt-1">
                  {errors.companyId}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="app-bg-primary text-white hover:opacity-90"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </div>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    Create Product
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
