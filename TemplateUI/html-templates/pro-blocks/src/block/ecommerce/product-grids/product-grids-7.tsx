import { Badge } from '@/components/core/badge';
import { Button } from '@/components/core/button';
import { Cart2, Heart } from '@tailgrids/icons';

interface Product {
  id: number;
  name: string;
  price: string;
  imageUrl: string;
  altText: string;
  status?: string;
  description: string;
}

const products: Product[] = [
  {
    id: 1,
    name: 'White Jacket',
    price: '$249.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-07/product-1.jpg',
    altText: 'White Jacket Image',
    status: 'Hot Item',
    description: 'Lightweight & water-resistant',
  },
  {
    id: 2,
    name: 'Tote Bag',
    price: '$209.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-07/product-2.jpg',
    altText: 'Tote Bag Image',
    description: 'Spacious & stylish',
  },
  {
    id: 3,
    name: 'Beige Cap',
    price: '$249.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-07/product-3.jpg',
    altText: 'Beige Cap Image',
    description: 'Soft breathable fabric',
  },
  {
    id: 4,
    name: 'Qua Watch',
    price: '$249.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-07/product-4.jpg',
    altText: 'Qua Watch Image',
    description: 'Modern rubber sole',
  },
];

export default function ProductGrids7() {
  return (
    <section className="bg-background-50 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <article key={product.id} className="relative">
              <a href="javascript:void(0)" className="group relative block">
                <img
                  src={product.imageUrl}
                  className="w-full rounded-lg"
                  alt={product.altText}
                />
                <Button
                  iconOnly
                  appearance="outline"
                  size="sm"
                  className="bg-background-50 ring-background-soft-500 absolute top-4 right-4 translate-y-6 transform rounded-full opacity-0 ring-1 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100"
                >
                  <Heart />
                </Button>
                {product.status && (
                  <Badge
                    size="sm"
                    color={
                      product.status === 'Hot Item' ? 'primary' : 'success'
                    }
                    className="absolute top-4 left-4"
                  >
                    {product.status}
                  </Badge>
                )}
              </a>
              <div className="mb-5 flex items-start pt-4">
                <div className="grow">
                  <h3 className="text-title-50 mb-1 text-base font-semibold">
                    <a href="javascript:void(0)">{product.name}</a>
                  </h3>
                  <p className="text-text-100 text-sm">{product.description}</p>
                </div>
                <div>
                  <span className="text-title-50 cursor-pointer font-medium">
                    {product.price}
                  </span>
                </div>
              </div>
              <Button
                appearance="outline"
                className="h-11 w-full py-2.5 text-base"
              >
                <Cart2 />
                Add to cart
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
