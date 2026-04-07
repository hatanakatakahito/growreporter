import { Cart2, Eye, Heart } from '@tailgrids/icons';

import { Badge } from '@/components/core/badge';

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
        d="M6.99998 0.900391C7.22809 0.900491 7.43694 1.02992 7.53807 1.23438L9.18553 4.57227L12.8691 5.10742C13.0949 5.14028 13.2828 5.29969 13.3535 5.5166C13.4238 5.73361 13.3645 5.97156 13.2012 6.13086L10.5351 8.72852L11.165 12.3984C11.2036 12.6234 11.1113 12.8511 10.9267 12.9854C10.7421 13.1195 10.497 13.1373 10.2949 13.0313L6.99998 11.2988L3.70506 13.0313C3.50299 13.1375 3.25796 13.1194 3.07322 12.9854C2.88872 12.8511 2.79543 12.6234 2.83396 12.3984L3.46287 8.72852L0.797831 6.13086C0.634806 5.97153 0.576135 5.73347 0.646464 5.5166C0.717125 5.29962 0.905007 5.14028 1.13084 5.10742L4.81346 4.57227L6.46189 1.23438L6.50486 1.16113C6.61563 0.999486 6.80044 0.900449 6.99998 0.900391Z"
        fill="#FACC15"
      />
    </svg>
  );
};
const HalfStarIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M7.99998 1.90039C7.80044 1.90045 7.61563 1.99949 7.50486 2.16113L7.46189 2.23438L5.81346 5.57227L2.13084 6.10742C1.90501 6.14028 1.71712 6.29962 1.64646 6.5166C1.57614 6.73347 1.63481 6.97153 1.79783 7.13086L4.46287 9.72852L3.83396 13.3984C3.79543 13.6234 3.88872 13.8511 4.07322 13.9854C4.25796 14.1194 4.50299 14.1375 4.70506 14.0313L7.99998 12.2988V1.90039Z"
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
  rating?: number;
}

const products: Product[] = [
  {
    id: 1,
    name: 'Blush Runner Sneakers',
    price: '$79.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-06/product-1.jpg',
    altText: 'Blush Runner Sneakers Image',
    status: '-20%',
    rating: 4.5,
  },
  {
    id: 2,
    name: 'Luxe Gold Wristwatch',
    price: '$120.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-06/product-2.jpg',
    altText: 'Luxe Gold Wristwatch Image',
    status: 'New Arrivals',
    rating: 4,
  },
  {
    id: 3,
    name: 'Urban Explorer Backpack',
    price: '$99.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-06/product-3.jpg',
    altText: 'Urban Explorer Backpack Image',
    rating: 5,
  },
  {
    id: 4,
    name: 'ProShot DSLR Camera',
    price: '$499.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-06/product-4.jpg',
    altText: 'ProShot DSLR Camera Image',
    rating: 4.5,
  },
  {
    id: 5,
    name: 'SkyFlyer Drone',
    price: '$199.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-06/product-5.jpg',
    altText: 'SkyFlyer Drone Image',
    rating: 5,
  },
  {
    id: 6,
    name: 'Wireless Earbuds Pro',
    price: '$59.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-06/product-6.jpg',
    altText: 'Wireless Earbuds Pro Image',
    rating: 5,
  },
  {
    id: 7,
    name: 'Rose Essence Perfume',
    price: '$45.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-06/product-7.jpg',
    altText: 'Rose Essence Perfume Image',
    rating: 4,
  },
  {
    id: 8,
    name: 'Minimalist Smart Speaker',
    price: '$89.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-06/product-8.jpg',
    altText: 'Minimalist Smart Speaker Image',
    rating: 3.5,
  },
];

const renderStars = (rating: number) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push(<StarIcon key={i} />);
    } else if (i === Math.ceil(rating) && !Number.isInteger(rating)) {
      stars.push(<HalfStarIcon key={i} />);
    } else {
      stars.push(<StarIcon key={i} />);
    }
  }
  return stars;
};

export default function ProductGrids6() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 sm:gap-x-7 sm:gap-y-9 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <article key={product.id} className="overflow-hidden">
              <a
                href="javascript:void(0)"
                className="group relative block rounded-xl"
              >
                {product.status && (
                  <Badge
                    size="sm"
                    color={
                      product.status === 'New Arrivals' ? 'success' : 'error'
                    }
                    className="absolute top-4 left-4"
                  >
                    {product.status}
                  </Badge>
                )}
                <img
                  src={product.imageUrl}
                  className="block w-full rounded-xl"
                  alt={product.altText}
                />
                <div className="bg-background-50 absolute right-2 bottom-2 left-2 flex h-12 translate-y-6 transform justify-between rounded-lg opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  <button className="text-title-50 border-base-100 hover:bg-background-soft-50 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-l-lg border-r p-3">
                    <Heart />
                  </button>
                  <button className="text-title-50 hover:bg-background-soft-50 flex flex-1 cursor-pointer items-center justify-center gap-3 p-3">
                    <Cart2 />
                    Add to cart
                  </button>
                  <button className="text-title-50 border-base-100 hover:bg-background-soft-50 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-r-lg border-l p-3">
                    <Eye />
                  </button>
                </div>
              </a>
              <div className="mt-5">
                <div className="flex items-center justify-between gap-5">
                  <h3 className="text-text-100 text-base font-medium">
                    <a href="javascript:void(0)">{product.name}</a>
                  </h3>
                  <p className="text-title-50 text-base font-medium">
                    {product.price}
                  </p>
                </div>
                <div className="mt-3 flex items-center">
                  {renderStars(product.rating || 0)}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
