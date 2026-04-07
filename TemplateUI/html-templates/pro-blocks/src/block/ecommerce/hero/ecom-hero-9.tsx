import { Button } from '@/components/core/button';

export default function EcomHero9() {
  return (
    <section className="bg-background-soft-100 p-5 lg:p-20">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-5 sm:flex-row xl:gap-8">
          <div className="bg-background-50 order-2 flex items-center rounded-2xl p-5 sm:order-1 sm:w-1/2 lg:px-16">
            <div className="w-full sm:max-w-md">
              <h1 className="text-title-50 mb-5 text-3xl font-medium xl:text-5xl">
                Effortless Style, Everyday Comfort
              </h1>
              <p className="text-text-100 mb-8 text-base leading-6 sm:mb-16 sm:pr-20">
                Discover our curated collection of premium apparel, designed to
                elevate your look and keep you comfortable.
              </p>
              <Button className="h-12 px-5">
                <a href="javascript:void(0)">Shop Now</a>
              </Button>
            </div>
          </div>
          <div className="order-1 sm:order-2 sm:w-1/2">
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-09/jacket.jpg"
              className="h-full w-full rounded-xl"
              alt=""
            />
          </div>
        </div>
      </div>
    </section>
  );
}
