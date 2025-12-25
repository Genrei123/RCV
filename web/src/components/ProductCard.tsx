// ...existing code...
import { Package, Calendar, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Product } from "@/typeorm/entities/product.entity";

interface ProductCardProps {
  product: Product;
  onClick?: (product: Product) => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const truncate = (value: string, max: number = 15) => {
    if (!value) return "";
    return value.length > max ? value.slice(0, max) + "..." : value;
  };

  const getExpirationStatus = (expirationDate: Date) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiration = Math.floor(
      (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration < 0) {
      return { label: "Expired", color: "app-bg-error-soft app-text-error" };
    } else if (daysUntilExpiration <= 30) {
      return {
        label: "Expiring Soon",
        color: "app-bg-secondary-soft app-text-secondary",
      };
    } else if (daysUntilExpiration <= 90) {
      return {
        label: "Expiring",
        color: "app-bg-secondary-soft app-text-secondary",
      };
    } else {
      return { label: "Active", color: "app-bg-success-soft app-text-success" };
    }
  };

  const status = getExpirationStatus(product.expirationDate);
  const isExpired = status.label === "Expired";

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
      <CardContent className="p-4 min-w-0" onClick={() => onClick?.(product)}>
        <div className="flex items-start justify-between mb-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isExpired ? "app-bg-error-soft" : "app-bg-primary-soft"
              }`}
            >
              <Package
                className={`h-5 w-5 ${
                  isExpired ? "app-text-error" : "app-text-primary"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <h3
                className="font-semibold text-gray-900 truncate w-full"
                title={product.productName}
              >
                {truncate(product.productName, 40)}
              </h3>
              <p
                className="text-sm text-gray-600 truncate w-full"
                title={product.brandName}
              >
                {truncate(product.brandName || "", 40)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={status.color}>{status.label}</Badge>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-[max-content_1fr] items-center text-sm min-w-0 gap-2">
            <span className="text-gray-500 justify-self-start">LTO Number:</span>
            <span
              className="font-medium text-gray-900 truncate min-w-0 text-right"
              title={product.LTONumber}
            >
              {truncate(product.LTONumber || "", 15)}
            </span>
          </div>

          <div className="grid grid-cols-[max-content_1fr] items-center text-sm min-w-0 gap-2">
            <span className="text-gray-500 justify-self-start">Lot Number:</span>
            <span
              className="font-medium text-gray-900 truncate min-w-0 text-right"
              title={product.lotNumber}
            >
              {truncate(product.lotNumber, 15)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t min-w-0 gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <Building2 className="h-4 w-4" />
            <span className="truncate min-w-0" title={product.company?.name}>
              {truncate(product.company?.name || "N/A", 40)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className={isExpired ? "text-red-600 font-medium" : ""}>
              {new Date(product.expirationDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(product);
            }}
            className="w-full"
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
// ...existing code...