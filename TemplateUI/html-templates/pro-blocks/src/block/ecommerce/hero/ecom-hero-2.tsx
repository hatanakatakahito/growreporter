import { Button } from '@/components/core/button';

export default function EcomHero2() {
  return (
    <section className="bg-background-50">
      <div className="mx-auto max-w-[1440px] p-5 sm:p-10 lg:p-20">
        <div className="flex flex-col gap-5 xl:flex-row">
          <div className="xl:w-9/12">
            <div className="flex flex-col items-center justify-between rounded-xl bg-gray-900 p-5 py-7 sm:flex-row lg:px-14 lg:py-16 xl:py-29">
              <div className="text-center sm:w-1/2 sm:text-left xl:max-w-md">
                <span className="text-text-200 mb-5 block text-sm font-medium uppercase">
                  samsung
                </span>
                <h1 className="text-white-100 mb-3 text-4xl font-semibold">
                  Galaxy S24 Ultra 5G.
                </h1>
                <p className="text-text-200 mb-8 text-base leading-6 sm:mb-12">
                  Galaxy AI is here | Pro-grade camera, seamless 5G, and
                  revolutionary AI – Redefine possibilities.
                </p>

                <Button className="bg-background-50 text-title-50 hover:bg-background-soft-100 h-11">
                  <a href="javascript:void(0)"> Buy Now $899</a>
                </Button>
              </div>
              <div className="mt-11 sm:mt-0">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-02/s-1.png"
                  className="h-full w-full"
                  alt="product"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:w-4/12 xl:grid-cols-1">
            <div className="bg-background-soft-100 flex items-center justify-between gap-4 rounded-xl p-6">
              <div className="flex w-1/2 flex-col justify-between gap-12">
                <div>
                  <span className="text-text-100 mb-2 inline-block text-sm font-medium uppercase">
                    xiaomi
                  </span>
                  <h3 className="text-title-50 text-xl font-semibold">
                    <a href="javascript:void(0)">Smart Security Home Camera </a>
                  </h3>
                </div>
                <div>
                  <Button className="h-11">
                    <a href="javascript:void(0)">Shop Now</a>
                  </Button>
                </div>
              </div>
              <div className="h-[214px] w-1/2">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-02/camera.png"
                  width="162"
                  height="214"
                  alt="product"
                />
              </div>
            </div>
            <div className="bg-background-soft-100 flex items-center justify-between gap-4 rounded-xl p-6">
              <div className="flex w-1/2 flex-col justify-between gap-12">
                <div>
                  <span className="text-text-100 mb-2 inline-block text-sm font-medium uppercase">
                    redmi
                  </span>
                  <h3 className="text-title-50 text-xl font-semibold">
                    <a href="javascript:void(0)">Smart Watch 5 lite </a>
                  </h3>
                </div>
                <div>
                  <Button className="h-11">
                    <a href="javascript:void(0)">Shop Now</a>
                  </Button>
                </div>
              </div>
              <div className="h-[214px] w-1/2">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-02/watch.png"
                  width="162"
                  height="214"
                  alt="product"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
