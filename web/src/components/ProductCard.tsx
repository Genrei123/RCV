import { Package, Calendar, Tag, MoreVertical } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export interface Product {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'pending' | 'inactive';
  createdDate: string;
  description?: string;
  price?: number;
  category?: string;
}

interface ProductCardProps {
  product: Product;
  onClick?: (product: Product) => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4" onClick={() => onClick?.(product)}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
              <p className="text-sm text-gray-600">ID: {product.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(product.status)}>
              {product.status}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                // Handle menu click
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {product.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              <span>{product.type}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{product.createdDate}</span>
            </div>
          </div>
          {product.price && (
            <span className="font-medium text-gray-900">
              ${product.price.toFixed(2)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}