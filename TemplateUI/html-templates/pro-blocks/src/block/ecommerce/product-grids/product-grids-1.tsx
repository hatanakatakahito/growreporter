import { Badge } from '@/components/core/badge';
import { Button } from '@/components/core/button';
import { Cart2, Eye, Heart } from '@tailgrids/icons';

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  altText: string;
  status?: string;
  statusColor?: string;
}

const products: Product[] = [
  {
    id: 1,
    name: 'LuxeTail Blazer Set',
    description: 'Power dressing made effortless.',
    price: '$249.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-01/product-1.jpg',
    altText: 'LuxeTail Blazer Set Image',
    status: 'Sale!',
    statusColor: 'red',
  },
  {
    id: 2,
    name: 'Ivory Edge Suit',
    description: 'Timeless tailoring with modern edge.',
    price: '$339.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-01/product-2.jpg',
    altText: 'Ivory Edge Suit Image',
  },
  {
    id: 3,
    name: 'NoirFlow Oversized Blazer',
    description: 'Sophisticated contrast statements.',
    price: '$499.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-01/product-3.jpg',
    altText: 'NoirFlow Oversized Blazer Image',
    status: 'New',
    statusColor: 'green',
  },
  {
    id: 4,
    name: 'Studio Ease Shirt & Flare',
    description: 'Relaxed elegance for everyday shine.',
    price: '$545.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-01/product-4.jpg',
    altText: 'Studio Ease Shirt & Flare Image',
  },
];

export default function ProductGrids1() {
  return (
    <section className="bg-background-50 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <article
              key={product.id}
              className="group relative cursor-pointer overflow-hidden"
            >
              <div className="relative overflow-hidden">
                {product.status && (
                  <Badge
                    size="sm"
                    color={product.statusColor === 'red' ? 'error' : 'success'}
                    className="absolute top-4 left-4"
                  >
                    {product.status}
                  </Badge>
                )}
                <a href="javascript:void(0)" className="block">
                  <img
                    src={product.imageUrl}
                    className="w-full rounded-lg"
                    alt={product.altText}
                  />
                </a>
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 translate-y-6 transform gap-2 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  <Button
                    iconOnly
                    appearance="outline"
                    size="sm"
                    className="text-title-50 bg-background-50 rounded-full"
                  >
                    <Cart2 />
                  </Button>
                  <Button
                    iconOnly
                    appearance="outline"
                    size="sm"
                    className="text-title-50 bg-background-50 rounded-full"
                  >
                    <Heart />
                  </Button>
                  <Button
                    iconOnly
                    appearance="outline"
                    size="sm"
                    className="text-title-50 bg-background-50 rounded-full"
                  >
                    <Eye />
                  </Button>
                </div>
              </div>
              <div className="pt-4">
                <h3 className="text-title-50 mb-1 text-base font-semibold">
                  <a href="javascript:void(0)">{product.name}</a>
                </h3>
                <p className="text-text-100 mb-4 text-xs">
                  {product.description}
                </p>
                <p className="text-title-50 text-base font-medium">
                  {product.price}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
