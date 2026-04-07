import { Button } from '@/components/core/button';

export default function EcomHero5() {
  return (
    <section className="bg-background-50">
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-8 p-3 sm:gap-16 lg:flex-row lg:items-center">
          <div className="lg:w-1/2">
            <div>
              <span className="bg-background-soft-100 text-text-50 mb-2 inline-flex h-6 items-center justify-center rounded-full px-2 py-1 text-sm font-medium">
                12GB + 512GB
              </span>
              <h1 className="text-title-50 mt-2.5 mb-4 text-4xl font-semibold sm:text-6xl">
                Iphone 16 Pro Max
              </h1>
              <p className="text-text-100 left-6 py-4 text-base">
                48MP Fusion | 48MP Ultra Wide | Telephoto. Camera Control.{' '}
                <br />
                4K 120 fps Dolby Vision. A18 Pro chip.
              </p>
              <h2 className="text-title-50 mb-8 text-xl sm:mb-11">
                From $1,199.00
              </h2>
              <Button>
                <a href="javascript:void(0)">Shop Now</a>
              </Button>
            </div>
          </div>
          <div className="lg:w-1/2">
            <div>
              <img
                src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-05/Immage.png"
                className="h-full w-full rounded-lg"
                alt=""
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
