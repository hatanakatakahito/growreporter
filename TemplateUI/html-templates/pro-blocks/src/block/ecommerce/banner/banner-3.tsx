import { Button } from '@/components/core/button';

export default function Banner3() {
  return (
    <section className="bg-background-50 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="bg-primary-500/15 absolute -top-36 -left-5 size-50 rounded-full"></div>
        <div className="flex flex-col xl:flex-row">
          <div className="pt-16 pb-11 xl:max-w-xl xl:py-20">
            <div className="text-center sm:text-left">
              <span className="text-primary-500 mb-3 block text-base font-medium">
                Special Offer
              </span>
              <h2 className="text-title-50 mb-3 text-4xl font-semibold sm:text-5xl">
                25% OFF YOUR FIRST ORDER
              </h2>
              <p className="text-text-100 mb-7 text-sm">
                Get 25% Off – Limited Time Only Refresh your wardrobe with
                modern essentials.
              </p>
              <div className="space-y-5 sm:flex sm:items-center sm:gap-5 sm:space-y-0">
                <Button className="px-6 py-3">
                  <a href="javascript:void(0)">Grab the offer</a>
                </Button>
                <p className="text-text-100 text-xs">
                  Use promo code {''}
                  <span className="text-title-50 text-sm font-semibold">
                    "WELCOME25"
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div>
            <img
              src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/banner/banner-03.png"
              className="right-0 max-w-full xl:absolute"
              alt=""
            />
          </div>
        </div>
      </div>
    </section>
  );
}
