import { Button } from '@/components/core/button';

export default function EcomHero6() {
  return (
    <section className="bg-background-50 px-4 py-16 lg:p-20">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-3 xl:flex-row">
          <div className="xl:w-7/12">
            <div className="bg-background-soft-100 flex flex-col justify-between gap-10 rounded-xl px-5 py-6 sm:flex-row sm:items-center lg:gap-16 lg:p-9">
              <div className="sm:w-1/2 lg:w-5/12">
                <span className="text-badge-success-text bg-badge-success-background inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium">
                  <span className="bg-badge-success-icon-color h-1.5 w-1.5 rounded-full"></span>
                  In Stock
                </span>
                <h1 className="text-title-50 mt-6 mb-3 text-4xl font-semibold">
                  Top Tech Picks
                </h1>
                <p className="text-text-100 mb-10 text-base">
                  Deep bass, noise canceling, <br />
                  wireless comfort.
                </p>
                <Button>
                  <a href="javascript:void(0)">Explore All</a>
                </Button>
              </div>
              <div className="flex justify-center sm:w-1/2 lg:w-7/12">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-06/product-lg.png"
                  className="rotate-15"
                  width="232"
                  height="305"
                  alt="product"
                />
              </div>
            </div>
          </div>
          <div className="xl:w-5/12">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col justify-between rounded-xl bg-blue-50 p-5">
                <span className="inline-block self-start rounded bg-white px-3 py-1 text-xs font-medium text-gray-800">
                  Gaming
                </span>
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-06/playstation.png"
                  className="mx-auto"
                  height="245"
                  width="284"
                  alt="product"
                />
                <a
                  href="javascript:void(0)"
                  className="texbse font-medium text-gray-700"
                >
                  Experience Next-Gen Power in the Palm of Your Hand
                </a>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="relative rounded-xl bg-orange-100 p-5">
                  <div className="flex gap-3">
                    <div className="flex grow flex-col justify-between">
                      <span className="inline-block flex-initial self-start rounded bg-white px-3 py-1 text-xs font-medium text-gray-800">
                        Sound
                      </span>
                      <a
                        href="javascript:void(0)"
                        className="inline-block text-base font-medium text-gray-700"
                      >
                        Ideas that speak volumes
                      </a>
                    </div>
                    <div className="shrink-0">
                      <img
                        src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-06/speaker.png"
                        height="142"
                        width="87"
                        className=""
                        alt="product"
                      />
                    </div>
                  </div>
                </div>
                <div className="relative rounded-xl bg-indigo-100 p-5">
                  <div className="flex gap-3">
                    <div className="flex grow flex-col justify-between">
                      <span className="inline-block flex-initial self-start rounded bg-white px-3 py-1 text-xs font-medium text-gray-800">
                        Watch
                      </span>
                      <a
                        href="javascript:void(0)"
                        className="inline-block text-base font-medium text-gray-700"
                      >
                        Elegant Design, Intelligent Features
                      </a>
                    </div>
                    <div className="shrink-0">
                      <img
                        src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-06/watch.png"
                        height="142"
                        width="87"
                        className=""
                        alt="product"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
