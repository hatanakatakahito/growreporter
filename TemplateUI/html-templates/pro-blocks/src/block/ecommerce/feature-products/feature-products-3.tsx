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
        d="M6.99998 0.900391C7.22809 0.900491 7.43694 1.02992 7.53807 1.23438L9.18553 4.57227L12.8691 5.10742C13.0949 5.14028 13.2828 5.29969 13.3535 5.5166C13.4238 5.73361 13.3645 5.97156 13.2012 6.13086L10.5351 8.72852L11.165 12.3984C11.2036 12.6234 11.1113 12.8511 10.9267 12.9854C10.7421 13.1195 10.497 13.1373 10.2949 13.0313L6.99998 11.2988L3.70506 13.0313C3.50299 13.1375 3.25796 13.1194 3.07322 12.9854C2.88872 12.8511 2.79543 12.6234 2.83396 12.3984L3.46287 8.72852L0.797831 6.13086C0.634806 5.97153 0.576135 5.73347 0.646464 5.5166C0.717125 5.29962 0.905007 5.14028 1.13084 5.10742L4.81346 4.57227L6.46189 1.23438L6.50486 1.16113C6.61563 0.999486 6.80044 0.900449 6.99998 0.900391Z"
        fill="#FACC15"
      />
    </svg>
  );
};

export default function FeatureProducts3() {
  return (
    <section className="bg-background-soft-100 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-lg text-center">
          <h2 className="text-title-50 mb-4 text-5xl font-semibold">
            Top Picks of the Week
          </h2>
          <p className="text-text-100 text-base sm:px-10">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="group bg-background-50 rounded-xl p-2">
            <div className="relative overflow-hidden">
              <span className="text-text-50 bg-background-soft-100 absolute top-4 left-4 rounded-full px-3 py-1 text-sm leading-5">
                Sold Out
              </span>
              <button className="bg-background-50 absolute top-4 right-4 inline-flex h-11 w-11 translate-y-6 transform items-center justify-center rounded-full opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                <Heart className="text-title-50 size-5" />
              </button>
              <a href="javascript:void(0)" className="block">
                <img
                  src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-03/product-1.jpg"
                  className="w-full rounded-lg"
                  alt=""
                />
              </a>
              <div className="absolute right-4 bottom-4 left-4 translate-y-6 transform opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                <Button
                  appearance="outline"
                  className="bg-background-50 h-12.5 w-full"
                >
                  <Cart2 className="size-6" />
                  Add to cart
                </Button>
              </div>
            </div>
            <div className="flex items-start px-4 py-6">
              <div className="grow">
                <h3 className="text-title-50 mb-2 text-lg font-medium">
                  <a href="javascript:void(0)" className="">
                    {' '}
                    Jo Malone London Cologne{' '}
                  </a>
                </h3>
                <div className="flex items-center">
                  <StarIcon />
                  <StarIcon />
                  <StarIcon />
                  <StarIcon />
                  <StarIcon />
                </div>
              </div>
              <div>
                <span className="text-title-50 text-xl font-semibold">
                  $87.00
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-5">
            <div className="group bg-background-50 rounded-xl p-2">
              <div className="relative overflow-hidden">
                <span className="bg-primary-50 text-primary-500 absolute top-4 left-4 rounded-full px-3 py-1 text-sm leading-5">
                  20% OFF
                </span>
                <button className="bg-background-50 absolute top-4 right-4 inline-flex h-11 w-11 translate-y-6 transform items-center justify-center rounded-full opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  <Heart className="text-title-50 size-5" />
                </button>
                <a href="javascript:void(0)" className="block">
                  <img
                    src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-03/product-2.jpg"
                    className="w-full rounded-lg"
                    alt=""
                  />
                </a>
                <div className="absolute right-4 bottom-4 left-4 translate-y-6 transform opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  <Button
                    appearance="outline"
                    className="bg-background-50 h-12.5 w-full"
                  >
                    <Cart2 className="size-6" />
                    Add to cart
                  </Button>
                </div>
              </div>
              <div className="flex items-start px-4 py-4">
                <div className="grow">
                  <h3 className="text-title-50 mb-2 text-lg font-medium">
                    <a href="javascript:void(0)" className="">
                      {' '}
                      Nécessaire Body Lotion
                    </a>
                  </h3>
                  <div className="flex items-center">
                    <StarIcon />
                    <StarIcon />
                    <StarIcon />
                    <StarIcon />
                    <StarIcon />
                  </div>
                </div>
                <div>
                  <span className="text-title-50 text-xl font-semibold">
                    $45.00
                  </span>
                </div>
              </div>
            </div>
            <div className="group bg-background-50 rounded-xl p-2">
              <div className="relative overflow-hidden">
                <button className="bg-background-50 absolute top-4 right-4 inline-flex h-11 w-11 translate-y-6 transform items-center justify-center rounded-full opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  <Heart className="text-title-50 size-5" />
                </button>
                <a href="javascript:void(0)" className="block">
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-03/product-3.jpg"
                    className="w-full rounded-lg"
                    alt="product"
                  />
                </a>
                <div className="absolute right-4 bottom-4 left-4 translate-y-6 transform opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  <Button
                    appearance="outline"
                    className="bg-background-50 h-12.5 w-full"
                  >
                    <Cart2 className="size-6" />
                    Add to cart
                  </Button>
                </div>
              </div>
              <div className="flex items-start px-4 py-4">
                <div className="grow">
                  <h3 className="text-title-50 mb-2 text-lg font-medium">
                    <a href="javascript:void(0)">Vitamin C Glow Serum</a>
                  </h3>
                  <div className="flex items-center">
                    <StarIcon />
                    <StarIcon />
                    <StarIcon />
                    <StarIcon />
                    <StarIcon />
                  </div>
                </div>
                <div>
                  <span className="text-title-50 text-xl font-semibold">
                    $87.00
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="group bg-background-50 rounded-xl p-2">
            <div className="relative overflow-hidden">
              <button className="bg-background-50 absolute top-4 right-4 inline-flex h-11 w-11 translate-y-6 transform items-center justify-center rounded-full opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                <Heart className="text-title-50 size-5" />
              </button>
              <a href="javascript:void(0)" className="block">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-03/product-4.jpg"
                  className="w-full rounded-lg"
                  alt=""
                />
              </a>
              <div className="absolute right-4 bottom-4 left-4 translate-y-6 transform opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                <Button
                  appearance="outline"
                  className="bg-background-50 h-12.5 w-full"
                >
                  <Cart2 className="size-6" />
                  Add to cart
                </Button>
              </div>
            </div>
            <div className="flex items-start px-4 py-6">
              <div className="grow">
                <h3 className="text-title-50 mb-2 text-lg font-medium">
                  <a href="javascript:void(0)" className="">
                    The Silence No. 5 Perfume
                  </a>
                </h3>
                <div className="flex items-center">
                  <StarIcon />
                  <StarIcon />
                  <StarIcon />
                  <StarIcon />
                  <StarIcon />
                </div>
              </div>
              <div>
                <span className="text-title-50 text-xl font-semibold">
                  $149.00
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
