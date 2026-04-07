import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { Xmark2x } from '@tailgrids/icons';

export default function Banner5() {
  return (
    <section className="bg-background-soft-100 min-h-screen px-11 py-14 lg:py-28">
      <div className="relative mx-auto max-w-[823px]">
        <div className="bg-background-50 flex flex-col overflow-hidden rounded-xl sm:flex-row">
          <div className="flex items-stretch sm:w-1/2 lg:w-3/5">
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/banner/banner-05/product-1.jpg"
              className="h-full w-full rounded-t-xl sm:rounded-t-none sm:rounded-l-xl"
              alt="girls"
            />
          </div>
          <div className="flex items-center px-4 py-7 sm:relative sm:w-1/2 sm:px-10 sm:py-20 lg:w-4/5">
            <Button
              iconOnly
              variant="ghost"
              className="bg-background-50 absolute top-5 right-5"
            >
              <Xmark2x className="size-5" />
            </Button>
            <div>
              <h2 className="text-title-50 mb-2 text-center text-4xl leading-10 font-semibold lg:px-10">
                Glow Starts Here <span className="text-primary-500">10%</span>{' '}
                Off Today
              </h2>
              <p className="text-text-100 mb-8 text-center leading-6 lg:px-8">
                Sign up now and receive an instant discount code in your inbox.
              </p>
              <form action="#">
                <div className="flex flex-col gap-3">
                  <Input type="text" placeholder="Enter your email" />
                  <Button>Get My Discount</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
