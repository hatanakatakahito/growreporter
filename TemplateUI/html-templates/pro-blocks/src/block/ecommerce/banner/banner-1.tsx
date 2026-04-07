import { Button } from '@/components/core/button';
import { Fire, Table2, TruckDeliveryCheckCircle } from '@tailgrids/icons';

export default function Banner1() {
  return (
    <section className="bg-background-50">
      <div className="mx-auto max-w-[1440px] px-4 xl:px-0">
        <div className="flex flex-col lg:flex-row lg:items-center">
          <div className="p-3 lg:w-1/2">
            <div className="relative">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/banner/banner-01.jpg"
                className="w-full rounded-2xl"
                alt="sofa"
              />
              <svg
                className="absolute top-0 right-21"
                xmlns="http://www.w3.org/2000/svg"
                width="6"
                height="80"
                viewBox="0 0 6 80"
                fill="none"
              >
                <path
                  d="M0.333337 77C0.333337 78.4728 1.52724 79.6667 3 79.6667C4.47276 79.6667 5.66667 78.4728 5.66667 77C5.66667 75.5272 4.47276 74.3333 3 74.3333C1.52724 74.3333 0.333337 75.5272 0.333337 77ZM3 0L2.5 2.18557e-08L2.5 1.01316L3 1.01316L3.5 1.01316L3.5 -2.18557e-08L3 0ZM3 3.03947L2.5 3.03947L2.5 5.06579L3 5.06579L3.5 5.06579L3.5 3.03947L3 3.03947ZM3 7.09211L2.5 7.09211L2.5 9.11842L3 9.11842L3.5 9.11842L3.5 7.09211L3 7.09211ZM3 11.1447L2.5 11.1447L2.5 13.1711L3 13.1711L3.5 13.1711L3.5 11.1447L3 11.1447ZM3 15.1974L2.5 15.1974L2.5 17.2237L3 17.2237L3.5 17.2237L3.5 15.1974L3 15.1974ZM3 19.25L2.5 19.25L2.5 21.2763L3 21.2763L3.5 21.2763L3.5 19.25L3 19.25ZM3 23.3026L2.5 23.3026L2.5 25.3289L3 25.3289L3.5 25.3289L3.5 23.3026L3 23.3026ZM3 27.3553L2.5 27.3553L2.5 29.3816L3 29.3816L3.5 29.3816L3.5 27.3553L3 27.3553ZM3 31.4079L2.5 31.4079L2.5 33.4342L3 33.4342L3.5 33.4342L3.5 31.4079L3 31.4079ZM3 35.4605L2.5 35.4605L2.5 37.4868L3 37.4868L3.5 37.4868L3.5 35.4605L3 35.4605ZM3 39.5132L2.5 39.5132L2.5 41.5395L3 41.5395L3.5 41.5395L3.5 39.5132L3 39.5132ZM3 43.5658L2.5 43.5658L2.5 45.5921L3 45.5921L3.5 45.5921L3.5 43.5658L3 43.5658ZM3 47.6184L2.5 47.6184L2.5 49.6447L3 49.6447L3.5 49.6447L3.5 47.6184L3 47.6184ZM3 51.6711L2.5 51.6711L2.5 53.6974L3 53.6974L3.5 53.6974L3.5 51.6711L3 51.6711ZM3 55.7237L2.5 55.7237L2.5 57.75L3 57.75L3.5 57.75L3.5 55.7237L3 55.7237ZM3 59.7763L2.5 59.7763L2.5 61.8027L3 61.8027L3.5 61.8027L3.5 59.7763L3 59.7763ZM3 63.829L2.5 63.829L2.5 65.8553L3 65.8553L3.5 65.8553L3.5 63.829L3 63.829ZM3 67.8816L2.5 67.8816L2.5 69.9079L3 69.9079L3.5 69.9079L3.5 67.8816L3 67.8816ZM3 71.9342L2.5 71.9342L2.5 73.9605L3 73.9605L3.5 73.9605L3.5 71.9342L3 71.9342ZM3 75.9869L2.5 75.9869L2.5 77L3 77L3.5 77L3.5 75.9869L3 75.9869Z"
                  fill="white"
                />
              </svg>
              <div className="bg-primary-500 absolute top-16 right-7 flex flex-col items-center rounded-2xl p-3">
                <span className="text-white-80 block text-base">Up to </span>
                <h2 className="text-white-100 text-xl font-semibold">
                  50% OFF
                </h2>
              </div>
            </div>
          </div>
          <div className="px-12 lg:w-1/2">
            <div>
              <h2 className="text-title-50 mb-5 text-4xl sm:text-5xl sm:leading-13">
                Timeless Furniture. Modern Living.
              </h2>
              <p className="text-text-100 mb-8 text-base sm:mb-10">
                Discover our collection of handcrafted, sustainable furniture
                designed to fit your lifestyle.
              </p>
              <Button className="px-6 py-3">
                <a href="javascript:void(0)">Explore More</a>
              </Button>
              <ul className="mt-20 flex gap-5">
                <li className="bg-background-soft-50 text-text-50 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium">
                  <Fire className="size-5" />
                  Limited-Time Offer
                </li>
                <li className="bg-background-soft-50 text-text-50 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium">
                  <Table2 className="size-5" />
                  Best Seller
                </li>
                <li className="bg-background-soft-50 text-text-50 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium">
                  <TruckDeliveryCheckCircle className="size-5" />
                  Free Delivery Over $300
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
