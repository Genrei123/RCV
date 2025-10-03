import { useState } from 'react';
import { Plus, Grid, List } from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/DataTable';
import type { Product } from '@/typeorm/entities/product.entity';
import { ProductCard } from '@/components/ProductCard';

export interface ProductsProps {
  products?: Product[];
  onProductClick?: (product: Product) => void;
  onAddProduct?: () => void;
  loading?: boolean;
}

export function Products(props: ProductsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const columns: Column[] = [
    {
      key: 'LTONumber',
      label: 'LTO Number'
    },
    {
      key: 'CFPRNumber',
      label: 'CFPR Number'
    },
    {
      key: 'brandName',
      label: 'Brand Name'
    },
    {
      key: 'productName',
      label: 'Product Name'
    },
    {
      key: 'lotNumber',
      label: 'Lot Number'
    },
    {
      key: 'expirationDate',
      label: 'Expiration Date',
      render: (value: Date) => {
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    },
    {
      key: 'company',
      label: 'Company',
      render: (value: any) => value?.name || 'N/A'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row: Product) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => props.onProductClick?.(row)}
          >
            View
          </Button>
        </div>
      )
    }
  ];

  const onSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <PageContainer
      title="Products"
      description="Manage and view all registered products in the system."
    >
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button onClick={props.onAddProduct}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        <div className="flex border rounded-lg">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-r-none"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <DataTable
          title=""
          columns={columns}
          data={props.products || []}
          searchPlaceholder="Search products..."
          onSearch={onSearch}
          onSort={(sortKey) => console.log('Sort by:', sortKey)}
          loading={props.loading || false}
          emptyStateTitle="No Products Found"
          emptyStateDescription="Try adjusting your search or add a new product to get started."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {props.products && props.products.length > 0 && (
            props.products?.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onClick={() => props.onProductClick?.(product)}
              />

            )))}
        </div>
      )}
    </PageContainer>
  );
}