import { Badge } from '@/components/core/badge';
import { Button } from '@/components/core/button';
import { Cart2, Heart } from '@tailgrids/icons';

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
const HalfStarIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="7"
      height="14"
      viewBox="0 0 7 14"
      fill="none"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M7.0001 0.900391C6.80056 0.900449 6.61575 0.999486 6.50498 1.16113L6.46202 1.23438L4.81358 4.57227L1.13096 5.10742C0.905129 5.14028 0.717247 5.29962 0.646586 5.5166C0.576257 5.73347 0.634928 5.97153 0.797953 6.13086L3.46299 8.72852L2.83409 12.3984C2.79556 12.6234 2.88884 12.8511 3.07334 12.9854C3.25809 13.1194 3.50311 13.1375 3.70518 13.0313L7.0001 11.2988V0.900391Z"
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
  ratingCount?: string;
}

const products: Product[] = [
  {
    id: 1,
    name: 'Cozy Swivel Armchair',
    price: '$249.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-04/product-1.jpg',
    altText: 'Cozy Swivel Armchair Image',
    status: 'Sale!',
    ratingCount: '5k+',
  },
  {
    id: 2,
    name: 'Azure Bistro Chairs (Set)',
    price: '$1.5k+',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-04/product-2.jpg',
    altText: 'Azure Bistro Chairs Image',
    status: 'New Added',
    ratingCount: '5k+',
  },
  {
    id: 3,
    name: 'Cloud Puff Lounge Chair',
    price: '$259.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-04/product-3.jpg',
    altText: 'Cloud Puff Lounge Chair Image',
    ratingCount: '100+',
  },
  {
    id: 4,
    name: 'Tan Modern Dining Chair',
    price: '$119.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-04/product-4.jpg',
    altText: 'Tan Modern Dining Chair Image',
    ratingCount: '78+',
  },
  {
    id: 5,
    name: 'Plush Barrel Chair',
    price: '$249.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-04/product-5.jpg',
    altText: 'Plush Barrel Chair Image',
    ratingCount: '5k+',
  },
  {
    id: 6,
    name: 'Midnight Blue Accent Chair',
    price: '$179.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-04/product-6.jpg',
    altText: 'Midnight Blue Accent Chair Image',
    ratingCount: '2.5k+',
  },
];

export default function ProductGrids4() {
  return (
    <section className="bg-background-soft-100 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="bg-background-50 rounded-2xl p-3"
            >
              <div className="group relative overflow-hidden">
                <Button
                  iconOnly
                  appearance="outline"
                  size="sm"
                  className="bg-background-50 absolute top-4 right-4 translate-y-6 transform rounded-full opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100"
                >
                  <Heart />
                </Button>
                {product.status && (
                  <Badge
                    size="sm"
                    color={product.status === 'Sale!' ? 'error' : 'success'}
                    className="absolute top-4 left-4"
                  >
                    {product.status === 'Sale!' ? 'Sale!' : 'New Added'}
                  </Badge>
                )}
                <a href="javascript:void(0)" className="block rounded-lg">
                  <img
                    src={product.imageUrl}
                    className="w-full rounded-lg"
                    alt={product.altText}
                  />
                </a>
              </div>
              <div className="mt-5 p-3">
                <div className="flex items-start">
                  <div className="grow">
                    <h3 className="text-title-50 mb-1 text-base font-semibold">
                      <a href="javascript:void(0)">{product.name}</a>
                    </h3>
                    <p className="text-text-100 text-sm leading-5">
                      {product.name.includes('Cozy') ||
                      product.name.includes('Plush')
                        ? 'Plush comfort for modern living'
                        : product.name.includes('Azure')
                          ? 'Vibrant style for any space'
                          : product.name.includes('Tan')
                            ? 'Sleek design for dining or work'
                            : product.name.includes('Cloud')
                              ? 'Ultra-soft seating, pure comfort'
                              : product.name.includes('Midnight')
                                ? 'Stylish support for any room'
                                : 'Deep cushioning for cozy moments'}
                    </p>
                  </div>
                  <div>
                    <span className="text-title-50 text-base font-medium">
                      {product.price}
                    </span>
                  </div>
                </div>
                {/* Rating */}
                <div className="mt-4 mb-5 flex items-center">
                  <StarIcon />
                  <StarIcon />
                  <StarIcon />
                  <StarIcon />
                  <HalfStarIcon />
                  <p className="text-text-100 ml-2 text-sm">
                    ({product.ratingCount || '0'})
                  </p>
                </div>

                <Button
                  appearance="outline"
                  className="h-11 w-full text-base font-medium"
                >
                  <Cart2 />
                  Add to cart
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
