import { Button } from '@/components/core/button';
import Navbar1 from '../navbar/navbar-1';

export default function Hero6() {
  return (
    <div className="bg-background-50 min-h-screen">
      <Navbar1 />
      <section className="bg-background-50 relative mx-auto max-w-[1440px] py-14 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 xl:px-0">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center xl:gap-24">
            <div className="lg:w-1/2">
              <div>
                <h1 className="text-title-50 mb-5 text-4xl font-semibold sm:text-5xl lg:pr-40">
                  Turn Sales Data into Revenue-Driving Decisions
                </h1>
                <p className="text-text-100 text-base lg:pr-40">
                  Visualize performance, track KPIs, and uncover hidden
                  opportunities with real-time dashboards
                </p>
                <div className="mt-8 flex w-full flex-col gap-4 sm:flex-row sm:items-center lg:mt-10">
                  <Button>
                    <a href="javascript:void(0)"> Get Started Free</a>
                  </Button>
                  <span className="text-text-100 text-center text-xs sm:w-28 sm:text-left">
                    30 day free after that $1 per month
                  </span>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <img
                      src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-06/Image-1.jpg"
                      className="w-full rounded-2xl"
                      alt="product"
                    />
                  </div>
                  <div>
                    <img
                      src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-06/Image-2.jpg"
                      className="w-full rounded-2xl"
                      alt="product"
                    />
                  </div>
                </div>
                <div>
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-06/Image-3.jpg"
                    className="w-full rounded-2xl"
                    alt="product"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
