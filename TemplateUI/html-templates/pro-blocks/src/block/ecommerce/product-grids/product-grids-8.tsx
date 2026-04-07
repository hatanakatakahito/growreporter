import { Badge } from '@/components/core/badge';
import { Button } from '@/components/core/button';
import { Cart2, Heart } from '@tailgrids/icons';

interface Product {
  id: number;
  name: string;
  price: string;
  author: string;
  imageUrl: string;
  altText: string;
  tags: string[];
}

const products: Product[] = [
  {
    id: 1,
    name: 'Tailwind Dashboard Template',
    price: '$69.00',
    author: 'Tailadmin',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-08/product-1.jpg',
    altText: 'Dashboard Preview',
    tags: ['Figma', 'UI Kit', 'Tailwind'],
  },
  {
    id: 2,
    name: 'Lineicons 26000+ Premium Icons',
    price: '$69.00',
    author: 'Lineicons',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-08/product-2.jpg',
    altText: 'Dashboard Preview',
    tags: ['Icons', 'Variables', 'Editable'],
  },
  {
    id: 3,
    name: 'Ai Starter Kit',
    price: '$99.00',
    author: 'Pimjo',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-08/product-3.jpg',
    altText: 'Dashboard Preview',
    tags: ['AI Agent', 'UI Kit', 'Dev'],
  },
];

export default function ProductGrids8() {
  return (
    <section className="bg-background-soft-100 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {products.map((product) => (
            <article key={product.id} className="bg-background-50 rounded-2xl">
              <div className="group relative overflow-hidden">
                <div>
                  <img
                    src={product.imageUrl}
                    alt={product.altText}
                    className="w-full rounded-t-xl"
                  />
                </div>
                <div className="absolute inset-0 flex h-full w-full items-center justify-center gap-2 rounded-t-xl bg-black/40 opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100">
                  <Button
                    iconOnly
                    appearance="outline"
                    size="sm"
                    className="text-title-50 bg-background-50 border-base-200 border"
                  >
                    <Heart className="size-5" />
                  </Button>
                  <Button
                    iconOnly
                    appearance="outline"
                    size="sm"
                    className="text-title-50 bg-background-50 border-base-200 border"
                  >
                    <Cart2 className="size-6" />
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-title-50 mb-1 text-base leading-6 font-semibold">
                      <a href="javascript:void(0)">{product.name}</a>
                    </h2>
                    <p className="text-text-100 text-sm">By {product.author}</p>
                  </div>
                  <span className="text-title-50 text-sm font-semibold">
                    {product.price}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 pb-5 text-sm">
                  {product.tags.map((tag, index) => (
                    <Badge key={index} color="gray" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="text-text-100 border-base-50 flex justify-between border-t pt-5 text-xs">
                  <span>Updated 1 month ago</span>
                  <span>V2.1</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
