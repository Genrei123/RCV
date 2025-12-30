import { useState } from 'react';
import {
  X,
  Package,
  Hash,
  Calendar,
  Building2,
  User,
  MapPin,
  Download,
  Camera,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/typeorm/entities/product.entity";
import { PDFGenerationService } from "@/services/pdfGenerationService";
import { toast } from "react-toastify";

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function ProductDetailsModal({
  isOpen,
  onClose,
  product,
}: ProductDetailsModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen || !product) return null;

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getFullName = (user: any): string => {
    if (!user) return "N/A";
    const parts = [user.firstName, user.middleName, user.lastName].filter(
      Boolean
    );
    return parts.join(" ") || "N/A";
  };

  const handleDownloadCertificate = async () => {
    if (!product || isDownloading) return;
    
    setIsDownloading(true);
    try {
      toast.info("Generating certificate PDF...", { autoClose: 1000 });
      await PDFGenerationService.generateAndDownloadProductCertificate(product);
      toast.success("Certificate downloaded successfully!");
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast.error("Failed to generate certificate. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 app-bg-primary-soft rounded-lg">
              <Package className="h-5 w-5 app-text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold app-text">Product Details</h2>
              <p className="text-sm app-text-subtle">
                View complete product information
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:app-bg-neutral rounded-lg transition-colors"
          >
            <X className="h-5 w-5 app-text-subtle" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold app-text mb-4">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    LTO Number
                  </label>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 app-text-subtle" />
                    <p className="app-text font-medium">{product.LTONumber}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    CFPR Number
                  </label>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 app-text-subtle" />
                    <p className="app-text font-medium">{product.CFPRNumber}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Lot Number
                  </label>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 app-text-subtle" />
                    <p className="app-text">{product.lotNumber}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Brand Name
                  </label>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 app-text-subtle" />
                    <p className="app-text">{product.brandName}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Product Name
                  </label>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 app-text-subtle" />
                    <p className="app-text font-medium">
                      {product.productName}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold app-text mb-4">
                Classification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Product Classification
                  </label>
                  <div>
                    <Badge variant="default">
                      {product.productClassification || "Not specified"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Product Sub-Classification
                  </label>
                  <div>
                    <Badge variant="secondary">
                      {product.productSubClassification || "Not specified"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold app-text mb-4">
                Important Dates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Date of Registration
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 app-text-subtle" />
                    <p className="app-text">
                      {formatDate(product.dateOfRegistration)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Expiration Date
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 app-text-subtle" />
                    <p className="app-text">
                      {formatDate(product.expirationDate)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium app-text-subtle">
                    Registered At
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 app-text-subtle" />
                    <p className="app-text">
                      {formatDate(product.registeredAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Images Section */}
            {(product.productImageFront || product.productImageBack) && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold app-text mb-4 flex items-center gap-2">
                  <Camera className="h-5 w-5 app-text-primary" />
                  Product Images
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.productImageFront && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium app-text-subtle">
                        Front Image
                      </label>
                      <div className="relative group">
                        <img
                          src={product.productImageFront}
                          alt="Product Front"
                          className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(product.productImageFront, '_blank')}
                        />
                        <button
                          onClick={() => window.open(product.productImageFront, '_blank')}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="View full size"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  {product.productImageBack && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium app-text-subtle">
                        Back Image
                      </label>
                      <div className="relative group">
                        <img
                          src={product.productImageBack}
                          alt="Product Back"
                          className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(product.productImageBack, '_blank')}
                        />
                        <button
                          onClick={() => window.open(product.productImageBack, '_blank')}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="View full size"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {product.company && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold app-text mb-4">
                  Company Information
                </h3>
                <div className="app-bg-neutral rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 app-text-primary mt-0.5" />
                        <div>
                          <label className="text-sm font-medium app-text-subtle block mb-1">
                            Company Name
                          </label>
                          <p className="app-text font-medium">
                            {product.company.name}
                          </p>
                        </div>
                      </div>
                    </div>
                    {product.company.address && (
                      <div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 app-text-subtle mt-0.5" />
                          <div>
                            <label className="text-sm font-medium app-text-subtle block mb-1">
                              Address
                            </label>
                            <p className="app-text">
                              {product.company.address}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {product.company.licenseNumber && (
                      <div>
                        <div className="flex items-center gap-2">
                          <Hash className="h-5 w-5 app-text-subtle mt-0.5" />
                          <div>
                            <label className="text-sm font-medium app-text-subtle block mb-1">
                              License Number
                            </label>
                            <p className="app-text">
                              {product.company.licenseNumber}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {product.registeredBy && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold app-text mb-4">
                  Registered By
                </h3>
                <div className="app-bg-neutral rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 app-text-primary mt-0.5" />
                        <div>
                          <label className="text-sm font-medium app-text-subtle block mb-1">
                            Full Name
                          </label>
                          <p className="app-text font-medium">
                            {getFullName(product.registeredBy)}
                          </p>
                        </div>
                      </div>
                    </div>
                    {product.registeredBy.email && (
                      <div>
                        <div className="flex items-center gap-2">
                          <Hash className="h-5 w-5 app-text-subtle mt-0.5" />
                          <div>
                            <label className="text-sm font-medium app-text-subtle block mb-1">
                              Email
                            </label>
                            <p className="app-text">
                              {product.registeredBy.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {product.registeredBy.phoneNumber && (
                      <div>
                        <div className="flex items-center gap-2">
                          <Hash className="h-5 w-5 app-text-subtle mt-0.5" />
                          <div>
                            <label className="text-sm font-medium app-text-subtle block mb-1">
                              Phone Number
                            </label>
                            <p className="app-text">
                              {product.registeredBy.phoneNumber}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 border-t mt-6">
              <h3 className="text-lg font-semibold app-text mb-4">
                Certificate
              </h3>
              <div className="p-4 app-bg-primary-soft border border-[color:var(--app-primary)]/30 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium app-text-primary mb-1">
                      Official Product Certificate
                    </p>
                    <p className="text-xs app-text-subtle">
                      Download an official certificate with QR code for
                      verification
                    </p>
                  </div>
                  <Button
                    onClick={handleDownloadCertificate}
                    disabled={isDownloading}
                    className="app-bg-primary hover:opacity-90 shrink-0 disabled:opacity-50"
                    size="sm"
                  >
                    <Download className={`h-4 w-4 mr-2 ${isDownloading ? 'animate-pulse' : ''}`} />
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
