import { useState, useEffect, useRef, useMemo } from "react";
import { X, Loader2, ImagePlus, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Product } from "@/typeorm/entities/product.entity";
import { submitUpdate } from "@/services/certificateUpdateService";
import { FirebaseStorageService } from "@/services/firebaseStorageService";
import { CompanyService } from "@/services/companyService";
import { toast } from "react-toastify";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product;
  companies: Array<{ _id: string; name: string }>;
}

export function EditProductModal({
  isOpen,
  onClose,
  onSuccess,
  product,
  companies,
}: EditProductModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyOptions, setCompanyOptions] = useState(companies);
  const hasFetchedCompanies = useRef(false);
  const COMPANY_FETCH_LIMIT = 2000;
  const [formData, setFormData] = useState({
    LTONumber: product.LTONumber || "",
    CFPRNumber: product.CFPRNumber || "",
    lotNumber: product.lotNumber || "",
    brandName: product.brandName || "",
    productName: product.productName || "",
    productClassification: product.productClassification || "",
    productSubClassification: product.productSubClassification || "",
    expirationDate: product.expirationDate 
      ? new Date(product.expirationDate).toISOString().split('T')[0]
      : "",
    companyId: product.companyId || "",
  });

  // Product Image states
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [frontImagePreview, setFrontImagePreview] = useState<string>(product.productImageFront || "");
  const [backImagePreview, setBackImagePreview] = useState<string>(product.productImageBack || "");
  const frontImageRef = useRef<HTMLInputElement>(null);
  const backImageRef = useRef<HTMLInputElement>(null);

  // Reset form when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        LTONumber: product.LTONumber || "",
        CFPRNumber: product.CFPRNumber || "",
        lotNumber: product.lotNumber || "",
        brandName: product.brandName || "",
        productName: product.productName || "",
        productClassification: product.productClassification || "",
        productSubClassification: product.productSubClassification || "",
        expirationDate: product.expirationDate 
          ? new Date(product.expirationDate).toISOString().split('T')[0]
          : "",
        companyId: product.companyId || "",
      });
      setFrontImagePreview(product.productImageFront || "");
      setBackImagePreview(product.productImageBack || "");
      setFrontImage(null);
      setBackImage(null);
    }
  }, [product]);

  // Keep company options in sync with props (when parent provides them)
  useEffect(() => {
    if (companies && companies.length > 0) {
      setCompanyOptions(companies);
      hasFetchedCompanies.current = true;
    }
  }, [companies]);

  // Fallback: fetch companies when opening (if none were provided)
  useEffect(() => {
    if (!isOpen) return;
    if (hasFetchedCompanies.current) return;
    if (companies && companies.length > 0) return;

    let isActive = true;
    setCompanyLoading(true);

    CompanyService.getCompaniesPage(1, COMPANY_FETCH_LIMIT)
      .then((response) => {
        if (!isActive) return;
        const fetched = response.companies || response.data || [];
        setCompanyOptions(fetched);
        hasFetchedCompanies.current = true;
        if (fetched.length === 0) {
          toast.info("No companies found. Please add a company first.");
        }
      })
      .catch((error) => {
        if (!isActive) return;
        // eslint-disable-next-line no-console
        console.error("Error fetching companies:", error);
        toast.error("Failed to load companies. Please refresh and try again.");
      })
      .finally(() => {
        if (isActive) setCompanyLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [isOpen, companies]);

  const mergedCompanyOptions = useMemo(() => {
    const map = new Map<string, { _id: string; name: string }>();
    for (const c of companyOptions || []) {
      if (c?._id) map.set(c._id, c);
    }
    // Ensure current company is visible even if list isn't loaded yet
    if (formData.companyId && !map.has(formData.companyId)) {
      map.set(formData.companyId, {
        _id: formData.companyId,
        name: product.company?.name || "Current company",
      });
    }
    return Array.from(map.values());
  }, [companyOptions, formData.companyId, product.company?.name]);

  // Disable background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const html = document.documentElement;
      const body = document.body;
      const previousHtmlOverflow = html.style.overflow;
      const previousBodyOverflow = body.style.overflow;
      const previousBodyPosition = body.style.position;
      const scrollY = window.scrollY;

      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      body.style.position = "fixed";
      body.style.width = "100%";
      body.style.top = `-${scrollY}px`;

      return () => {
        html.style.overflow = previousHtmlOverflow;
        body.style.overflow = previousBodyOverflow;
        body.style.position = previousBodyPosition;
        body.style.width = "";
        body.style.top = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Handle image file selection
  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "front" | "back"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === "front") {
        setFrontImage(file);
        setFrontImagePreview(reader.result as string);
      } else {
        setBackImage(file);
        setBackImagePreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (type: "front" | "back") => {
    if (type === "front") {
      setFrontImage(null);
      setFrontImagePreview("");
      if (frontImageRef.current) frontImageRef.current.value = "";
    } else {
      setBackImage(null);
      setBackImagePreview("");
      if (backImageRef.current) backImageRef.current.value = "";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product._id) {
      toast.error("Product ID is missing");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload new images if selected
      let productImageFrontUrl: string | undefined = product.productImageFront;
      let productImageBackUrl: string | undefined = product.productImageBack;

      if (frontImage || backImage) {
        toast.info("Uploading product images...", { autoClose: 1500 });
      }

      const timestamp = Date.now();

      if (frontImage) {
        const frontPath = `product-images/${formData.LTONumber.replace(/[^a-zA-Z0-9]/g, '-')}/front-${timestamp}`;
        const response = await FirebaseStorageService.uploadAgentVerificationDocument(frontImage, frontPath);
        productImageFrontUrl = response.downloadUrl;
      }

      if (backImage) {
        const backPath = `product-images/${formData.LTONumber.replace(/[^a-zA-Z0-9]/g, '-')}/back-${timestamp}`;
        const response = await FirebaseStorageService.uploadAgentVerificationDocument(backImage, backPath);
        productImageBackUrl = response.downloadUrl;
      }

      // Submit update with image URLs
      await submitUpdate(product._id, {
        ...formData,
        productImageFront: productImageFrontUrl,
        productImageBack: productImageBackUrl,
      });

      toast.success("Update request submitted for approval!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error submitting update:", error);
      toast.error(error.response?.data?.message || "Failed to submit update request");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-bold app-text">Edit Product</h2>
            <p className="text-sm app-text-subtle">
              Changes will be submitted for admin approval
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:app-bg-neutral rounded-lg transition-colors"
          >
            <X className="h-5 w-5 app-text-subtle" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="LTONumber">LTO Number *</Label>
              <Input
                id="LTONumber"
                name="LTONumber"
                value={formData.LTONumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="CFPRNumber">CFPR Number *</Label>
              <Input
                id="CFPRNumber"
                name="CFPRNumber"
                value={formData.CFPRNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lotNumber">Lot Number *</Label>
              <Input
                id="lotNumber"
                name="lotNumber"
                value={formData.lotNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name *</Label>
              <Input
                id="brandName"
                name="brandName"
                value={formData.brandName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productClassification">Classification *</Label>
              <Input
                id="productClassification"
                name="productClassification"
                value={formData.productClassification}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productSubClassification">Sub-Classification *</Label>
              <Input
                id="productSubClassification"
                name="productSubClassification"
                value={formData.productSubClassification}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expirationDate">Expiration Date *</Label>
              <Input
                id="expirationDate"
                name="expirationDate"
                type="date"
                value={formData.expirationDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyId">Company *</Label>
              <select
                id="companyId"
                name="companyId"
                value={formData.companyId}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
                disabled={companyLoading || isSubmitting}
              >
                <option value="">
                  {companyLoading ? "Loading companies..." : "Select a company"}
                </option>
                {mergedCompanyOptions.map((company) => (
                  <option key={company._id} value={company._id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Image (Front) */}
            <div className="space-y-2 md:col-span-2">
              <Label>Product Image (Front)</Label>
              <div className="flex flex-col gap-3">
                <input
                  ref={frontImageRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, "front")}
                  className="hidden"
                  id="frontImageUpload"
                />
                
                {frontImagePreview ? (
                  <div className="relative w-full h-48 bg-neutral-100 rounded-lg overflow-hidden">
                    <img
                      src={frontImagePreview}
                      alt="Front preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage("front")}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="frontImageUpload"
                    className="flex flex-col items-center justify-center w-full h-48 bg-neutral-100 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-200 transition-colors"
                  >
                    <ImagePlus className="h-12 w-12 text-neutral-400 mb-2" />
                    <span className="text-sm text-neutral-600">Click to upload front image</span>
                    <span className="text-xs text-neutral-500 mt-1">Max 10MB</span>
                  </label>
                )}
              </div>
            </div>

            {/* Product Image (Back) */}
            <div className="space-y-2 md:col-span-2">
              <Label>Product Image (Back)</Label>
              <div className="flex flex-col gap-3">
                <input
                  ref={backImageRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, "back")}
                  className="hidden"
                  id="backImageUpload"
                />
                
                {backImagePreview ? (
                  <div className="relative w-full h-48 bg-neutral-100 rounded-lg overflow-hidden">
                    <img
                      src={backImagePreview}
                      alt="Back preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage("back")}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="backImageUpload"
                    className="flex flex-col items-center justify-center w-full h-48 bg-neutral-100 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-200 transition-colors"
                  >
                    <Camera className="h-12 w-12 text-neutral-400 mb-2" />
                    <span className="text-sm text-neutral-600">Click to upload back image</span>
                    <span className="text-xs text-neutral-500 mt-1">Max 10MB</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit for Approval"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
