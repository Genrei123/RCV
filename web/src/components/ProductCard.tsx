import { Package, Calendar, Building2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Product } from "@/typeorm/entities/product.entity";

interface ProductCardProps {
  product: Product;
  onClick?: (product: Product) => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const getExpirationStatus = (expirationDate: Date) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiration = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration < 0) {
      return { label: 'Expired', color: 'bg-red-100 text-red-800' };
    } else if (daysUntilExpiration <= 30) {
      return { label: 'Expiring Soon', color: 'bg-yellow-100 text-yellow-800' };
    } else if (daysUntilExpiration <= 90) {
      return { label: 'Expiring', color: 'bg-orange-100 text-orange-800' };
    } else {
      return { label: 'Active', color: 'bg-green-100 text-green-800' };
    }
  };

  const status = getExpirationStatus(product.expirationDate);
  const isExpired = status.label === 'Expired';

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4" onClick={() => onClick?.(product)}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isExpired ? 'bg-red-100' : 'bg-blue-100'
            }`}>
              <Package className={`h-5 w-5 ${isExpired ? 'text-red-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{product.productName}</h3>
              <p className="text-sm text-gray-600">{product.brandName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={status.color}>
              {status.label}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">LTO Number:</span>
            <span className="font-medium text-gray-900">{product.LTONumber}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Lot Number:</span>
            <span className="font-medium text-gray-900">{product.lotNumber}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t">
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            <span className="truncate max-w-[150px]">{product.company?.name || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span className={isExpired ? 'text-red-600 font-medium' : ''}>
              {new Date(product.expirationDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
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