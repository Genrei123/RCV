import { useEffect, useRef, useState } from "react";
import { X, Package, Hash, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductService } from "@/services/productService";
import type { CreateProductRequest } from "@/services/productService";
import { CompanyService } from "@/services/companyService";
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
  const [companyInputValue, setCompanyInputValue] = useState("");
  const [allCompanies, setAllCompanies] = useState(companies);
  const [companyOptions, setCompanyOptions] = useState(companies);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const companyDropdownRef = useRef<HTMLDivElement | null>(null);
  const hasFetchedAllCompanies = useRef(false);
  const COMPANY_FETCH_LIMIT = 2000;

  useEffect(() => {
    setAllCompanies(companies);
    setCompanyOptions(companies);
  }, [companies]);

  useEffect(() => {
    const query = companyInputValue.trim().toLowerCase();
    if (!query) {
      setCompanyOptions(allCompanies);
      return;
    }
    setCompanyOptions(
      allCompanies.filter((company) =>
        company.name.toLowerCase().includes(query)
      )
    );
  }, [companyInputValue, allCompanies]);

  useEffect(() => {
    if (!companyDropdownOpen || hasFetchedAllCompanies.current) return;

    let isActive = true;
    setCompanyLoading(true);

    CompanyService.getCompaniesPage(1, COMPANY_FETCH_LIMIT)
      .then((response) => {
        if (!isActive) return;
        const fetchedCompanies = response.companies || response.data || [];
        setAllCompanies(fetchedCompanies);
        setCompanyOptions(fetchedCompanies);
        hasFetchedAllCompanies.current = true;
      })
      .catch((error) => {
        if (isActive) {
          console.error("Error fetching companies:", error);
        }
      })
      .finally(() => {
        if (isActive) {
          setCompanyLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [companyDropdownOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        companyDropdownRef.current &&
        !companyDropdownRef.current.contains(event.target as Node)
      ) {
        setCompanyDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleCompanyInputChange = (value: string) => {
    setCompanyInputValue(value);
    setCompanyDropdownOpen(true);
    if (formData.companyId) {
      setFormData((prev) => ({ ...prev, companyId: "" }));
    }
    if (errors.companyId) {
      setErrors((prev) => ({ ...prev, companyId: "" }));
    }
  };

  const handleCompanySelect = (company: { _id: string; name: string }) => {
    setFormData((prev) => ({ ...prev, companyId: company._id }));
    setCompanyInputValue(company.name);
    setCompanyDropdownOpen(false);
    if (errors.companyId) {
      setErrors((prev) => ({ ...prev, companyId: "" }));
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    // Dismiss any validation toast when user edits inputs
    toast.dismiss("validation-error");
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Helper constraints
    const MAX_LENGTH = 50; 
    const MSG_REQUIRED = "required"; // Keyword to check for emptiness
    const MSG_TOO_LONG = `Must be ${MAX_LENGTH} characters or less`;

    // --- Validate LTO Number ---
    if (!formData.LTONumber.trim()) {
      newErrors.LTONumber = "LTO Number is required";
    } else if (formData.LTONumber.length > MAX_LENGTH) {
      newErrors.LTONumber = MSG_TOO_LONG;
    }

    // --- Validate CFPR Number ---
    if (!formData.CFPRNumber.trim()) {
      newErrors.CFPRNumber = "CFPR Number is required";
    } else if (formData.CFPRNumber.length > MAX_LENGTH) {
      newErrors.CFPRNumber = MSG_TOO_LONG;
    }

    // --- Validate Lot Number ---
    if (!formData.lotNumber.trim()) {
      newErrors.lotNumber = "Lot Number is required";
    } else if (formData.lotNumber.length > MAX_LENGTH) {
      newErrors.lotNumber = MSG_TOO_LONG;
    }

    // --- Validate Brand Name ---
    if (!formData.brandName.trim()) {
      newErrors.brandName = "Brand Name is required";
    } else if (formData.brandName.length > MAX_LENGTH) {
      newErrors.brandName = MSG_TOO_LONG;
    }

    // --- Validate Product Name ---
    if (!formData.productName.trim()) {
      newErrors.productName = "Product Name is required";
    } else if (formData.productName.length > MAX_LENGTH) {
      newErrors.productName = MSG_TOO_LONG;
    }

    // --- Validate Classifications ---
    if (!formData.productClassification.trim()) {
      newErrors.productClassification = "Product Classification is required";
    } else if (formData.productClassification.length > MAX_LENGTH) {
      newErrors.productClassification = MSG_TOO_LONG;
    }

    if (!formData.productSubClassification.trim()) {
      newErrors.productSubClassification = "Product Sub-Classification is required";
    } else if (formData.productSubClassification.length > MAX_LENGTH) {
      newErrors.productSubClassification = MSG_TOO_LONG;
    }

    // --- Validate Dates ---
    if (!formData.expirationDate) {
      newErrors.expirationDate = "Expiration Date is required";
    }

    if (!formData.companyId) {
      newErrors.companyId = "Company is required";
    }

    setErrors(newErrors);

    // --- UPDATED NOTIFICATION LOGIC ---
    const errorValues = Object.values(newErrors);
    
    if (errorValues.length > 0) {
      // Check if ALL errors are just missing fields (contain the word 'required')
      const isOnlyEmptyFields = errorValues.every(err => err.toLowerCase().includes(MSG_REQUIRED));

      if (isOnlyEmptyFields) {
        toast.error("Please fill in all required fields", { toastId: "validation-error" });
      } else {
        // If there are specific validation errors (like too long), show the specific list
        const fieldLabelMap: Record<string, string> = {
          LTONumber: "LTO Number",
          CFPRNumber: "CFPR Number",
          lotNumber: "Lot Number",
          brandName: "Brand Name",
          productName: "Product Name",
          productClassification: "Product Classification",
          productSubClassification: "Product Sub-Classification",
          expirationDate: "Expiration Date",
          companyId: "Company",
        };

        const fields = Object.keys(newErrors).map((k) => fieldLabelMap[k] || k);
        toast.error(`Please fix: ${fields.join(", ")}`, {
          toastId: "validation-error",
        });
      }
    } else {
      toast.dismiss("validation-error");
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // REMOVED: toast.error("Please fill in all required fields");
      // The validateForm function now handles the toast display logic.
      return;
    }

    setLoading(true);
    // ... rest of the function remains the same

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
      setCompanyInputValue("");
      setCompanyDropdownOpen(false);

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
      setCompanyInputValue("");
      setCompanyDropdownOpen(false);
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                      errors.LTONumber ? "!border-red-500 !ring-1 !ring-red-200" : ""
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
                      errors.CFPRNumber ? "!border-red-500 !ring-1 !ring-red-200" : ""
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
                    errors.lotNumber ? "!border-red-500 !ring-1 !ring-red-200" : ""
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
                        errors.brandName ? "!border-red-500 !ring-1 !ring-red-200" : ""
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
                        ? "!border-red-500 !ring-1 !ring-red-200"
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
                        ? "!border-red-500 !ring-1 !ring-red-200"
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
                        ? "!border-red-500 !ring-1 !ring-red-200"
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
                        ? "!border-red-500 !ring-1 !ring-red-200"
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
              <div className="relative" ref={companyDropdownRef}>
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 app-text-subtle h-4 w-4" />
                <Input
                  type="text"
                  name="companySearch"
                  autoComplete="off"
                  value={companyInputValue}
                  onFocus={() => setCompanyDropdownOpen(true)}
                  onChange={(e) => handleCompanyInputChange(e.target.value)}
                  placeholder="Search or select a company"
                  className={`pl-10 ${
                    errors.companyId
                      ? "!border-red-500 !ring-1 !ring-red-200"
                      : "app-border-neutral"
                  }`}
                  disabled={loading}
                />
                {companyDropdownOpen && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {companyLoading ? (
                      <div className="p-3 text-sm text-gray-500">
                        Searching companies...
                      </div>
                    ) : companyOptions.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">
                        No companies found
                      </div>
                    ) : (
                      companyOptions.map((company) => (
                        <button
                          key={company._id}
                          type="button"
                          onClick={() => handleCompanySelect(company)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                            formData.companyId === company._id
                              ? "bg-gray-100 font-medium"
                              : ""
                          }`}
                        >
                          {company.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
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
