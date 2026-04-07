import { Badge } from '@/components/core/badge';
import { Button } from '@/components/core/button';
import {
  ArrowBothDirectionHorizontal2,
  Cart2,
  Eye,
  Heart,
} from '@tailgrids/icons';

const StarIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
    >
      <path
        d="M7.0001 0.900391C7.22821 0.900491 7.43707 1.02992 7.53819 1.23438L9.18565 4.57227L12.8692 5.10742C13.095 5.14028 13.2829 5.29969 13.3536 5.5166C13.4239 5.73361 13.3646 5.97156 13.2013 6.13086L10.5353 8.72852L11.1651 12.3984C11.2037 12.6234 11.1115 12.8511 10.9269 12.9854C10.7422 13.1195 10.4971 13.1373 10.295 13.0313L7.0001 11.2988L3.70518 13.0313C3.50311 13.1375 3.25809 13.1194 3.07334 12.9854C2.88884 12.8511 2.79556 12.6234 2.83409 12.3984L3.46299 8.72852L0.797953 6.13086C0.634928 5.97153 0.576257 5.73347 0.646586 5.5166C0.717247 5.29962 0.90513 5.14028 1.13096 5.10742L4.81358 4.57227L6.46202 1.23438L6.50498 1.16113C6.61575 0.999486 6.80056 0.900449 7.0001 0.900391Z"
        fill="#FACC15"
      />
    </svg>
  );
};

interface Product {
  id: number;
  name: string;
  price: string;
  imageUrl: string;
  altText: string;
  status?: string;
}

const products: Product[] = [
  {
    id: 1,
    name: 'Midnight Black Frames',
    price: '$42.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-03/product-1.jpg',
    altText: 'Midnight Black Frames Image',
    status: 'Sale!',
  },
  {
    id: 2,
    name: 'Lemon Zest Shades',
    price: '$44.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-03/product-2.jpg',
    altText: 'Lemon Zest Shades Image',
  },
  {
    id: 3,
    name: 'Frosted Blue Sunnies',
    price: '$49.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-03/product-3.jpg',
    altText: 'Frosted Blue Sunnies Image',
  },
  {
    id: 4,
    name: 'Blush Pink Cat-Eyes',
    price: '$59.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-03/product-4.jpg',
    altText: 'Blush Pink Cat-Eyes Image',
    status: 'Sale!',
  },
  {
    id: 5,
    name: 'Ocean Blue Ovals',
    price: '$38.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-03/product-5.jpg',
    altText: 'Ocean Blue Ovals Image',
  },
  {
    id: 6,
    name: 'Rose Gold Retro Frames',
    price: '$45.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-03/product-6.jpg',
    altText: 'Rose Gold Retro Frames Image',
  },
  {
    id: 7,
    name: 'Mint Green Vision',
    price: '$24.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-03/product-7.jpg',
    altText: 'Mint Green Vision Image',
    status: 'Sale!',
  },
  {
    id: 8,
    name: 'Lavender Dream Glasses',
    price: '$41.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-03/product-8.jpg',
    altText: 'Lavender Dream Glasses Image',
  },
];

export default function ProductGrids3() {
  return (
    <section className="bg-background-50 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 sm:gap-y-11 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <article key={product.id} className="relative cursor-pointer">
              <div className="group relative overflow-hidden">
                {product.status && (
                  <Badge
                    size="sm"
                    color="error"
                    className="absolute top-4 left-4"
                  >
                    {product.status}
                  </Badge>
                )}
                <a href="javascript:void(0)" className="block">
                  <img
                    src={product.imageUrl}
                    className="w-full rounded-xl"
                    alt={product.altText}
                  />
                </a>
                <div className="absolute right-4 bottom-4 left-4 translate-y-6 transform opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  <Button
                    appearance="outline"
                    className="h-11 w-full text-base font-medium"
                  >
                    <Cart2 />
                    Add to cart
                  </Button>
                </div>
                <div className="absolute top-4 right-4 flex translate-y-6 transform flex-col gap-2 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  <Button
                    iconOnly
                    appearance="outline"
                    size="sm"
                    className="text-title-50 bg-background-50 hover:bg-background-soft-100 rounded-full"
                  >
                    <Heart />
                  </Button>
                  <Button
                    iconOnly
                    appearance="outline"
                    size="sm"
                    className="text-title-50 bg-background-50 hover:bg-background-soft-100 rounded-full"
                  >
                    <Eye />
                  </Button>
                  <Button
                    iconOnly
                    appearance="outline"
                    size="sm"
                    className="text-title-50 bg-background-50 hover:bg-background-soft-100 rounded-full"
                  >
                    <ArrowBothDirectionHorizontal2 />
                  </Button>
                </div>
              </div>
              <div className="pt-6">
                <h3 className="text-text-100 mb-3 text-base font-normal">
                  <a href="javascript:void(0)">{product.name}</a>
                </h3>
                <div className="flex items-center justify-between">
                  <p className="text-title-50 text-base font-medium">
                    {product.price}
                  </p>
                  <div className="flex items-center">
                    <StarIcon />
                    <StarIcon />
                    <StarIcon />
                    <StarIcon />
                    <StarIcon />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
