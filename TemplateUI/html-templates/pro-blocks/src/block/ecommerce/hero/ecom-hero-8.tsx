import { Button } from '@/components/core/button';

export default function EcomHero8() {
  return (
    <section className="bg-background-50">
      <div className="relative mx-auto max-w-[1440px]">
        <div className="flex flex-col xl:flex-row xl:items-center">
          <div className="flex items-center pt-16 pb-8 xl:w-1/2 xl:pt-0 xl:pb-0">
            <div className="px-5 lg:px-20">
              <span className="text-text-100 mb-2 inline-block text-xl">
                New Arrival
              </span>
              <h1 className="text-title-50 mb-3 text-4xl font-medium lg:text-5xl">
                Redefine Radiance This Winter
              </h1>
              <p className="text-text-100 mb-6 text-base lg:pr-16">
                A curated selection of premium skincare essentials crafted with
                nourishing botanicals. Designed to protect, hydrate, and elevate
                your daily beauty ritual
              </p>
              <h2 className="text-title-50 text-3xl font-semibold">
                <span>$142.99</span>
                <span className="text-text-100 font-medium line-through">
                  $205.99
                </span>
              </h2>
              <div className="mt-10 flex flex-col items-center gap-3 sm:mt-18 sm:flex-row sm:gap-5">
                <Button className="h-12">
                  <a href="javascript:void(0)">Shop Collection</a>
                </Button>
                <Button appearance="outline" className="h-12">
                  <a href="javascript:void(0)">Discover Look</a>
                </Button>
              </div>
            </div>
          </div>
          <div className="xl:w-1/2">
            <div className="relative">
              <img
                src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-08/Image.jpg"
                className="h-full w-full"
                alt=""
              />
              <div className="bg-background-50/70 absolute right-4 bottom-4 w-56 rounded-xl px-3 py-6 text-center backdrop-blur-xs sm:right-12 sm:bottom-12">
                <h3 className="text-title-50 mb-1 font-semibold">
                  Complimentary Gift
                </h3>
                <p className="text-text-100 mb-5 text-sm">
                  Receive a silk beauty pouch with purchases over $300.
                </p>
                <a
                  href="javascript:void(0)"
                  className="text-text-100 inline-flex items-center gap-1.5 text-sm font-medium underline"
                >
                  View Details
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="21"
                    height="20"
                    viewBox="0 0 21 20"
                    fill="none"
                  >
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M15.9548 4.40846C15.8473 4.32542 15.7165 4.27095 15.5739 4.25642L15.4973 4.25297L8.00129 4.24951C7.58699 4.24937 7.25067 4.58584 7.25052 4.99996C7.25062 5.41388 7.58645 5.74958 8.0006 5.74972L13.6912 5.75089L4.97157 14.4705C4.67878 14.7634 4.67871 15.2383 4.97157 15.5312C5.26444 15.8241 5.73933 15.824 6.03223 15.5312L14.7475 6.81593L14.7492 12.4955C14.7495 12.9095 15.0852 13.2453 15.4993 13.2453C15.9134 13.2451 16.2492 12.9093 16.2494 12.4955L16.2467 5.06032C16.2624 4.85007 16.1899 4.63445 16.0291 4.47367C16.0055 4.45003 15.9806 4.42829 15.9548 4.40846Z"
                      fill="currentColor"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
