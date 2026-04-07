import { Button } from '@/components/core/button';

export default function Banner4() {
  return (
    <section className="bg-background-50 p-11">
      <div className="mx-auto max-w-[1440px] px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <img
              src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/banner/banner-04/product-1.jpg"
              className="w-full rounded-2xl"
              alt="girls"
            />
          </div>
          <div className="bg-background-soft-100 flex items-center justify-center rounded-2xl p-5 xl:p-10">
            <div className="text-center">
              <h2 className="text-title-50 mb-3 text-4xl leading-13 font-semibold xl:px-8 xl:text-5xl">
                Don’t Miss Out 50% OFF
              </h2>
              <p className="text-text-100 mb-7 text-sm leading-5 xl:px-8">
                Get 50% Off – Limited Time Only Refresh your wardrobe with
                modern essentials.
              </p>
              <div className="flex justify-center">
                <Button>
                  <a href="javascript:void(0)">Shop Now</a>
                </Button>
              </div>
            </div>
          </div>
          <div>
            <img
              src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/banner/banner-04/product-2.jpg"
              className="w-full rounded-2xl"
              alt="girls"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
