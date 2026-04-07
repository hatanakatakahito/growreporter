import { Button } from '@/components/core/button';
import { Gear1, PieChart1 } from '@tailgrids/icons';
import Navbar1 from '../navbar/navbar-1';

export default function Hero5() {
  return (
    <div className="bg-background-50 min-h-screen">
      <Navbar1 />
      <section className="bg-background-50 relative mx-auto max-w-[1440px] py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 xl:px-0">
          <div className="flex flex-col items-center gap-20 lg:flex-row">
            <div className="lg:w-1/2">
              <span className="bg-badge-neutral-background text-badge-neutral-text inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium">
                <span className="text-badge-neutral-icon-color inline-block h-1.5 w-1.5 rounded-full"></span>
                All in one platform
              </span>
              <h1 className="text-title-50 smtext-5xl my-5 pr-52 text-4xl font-semibold">
                Turn Sales Data into Revenue Boost
              </h1>
              <p className="text-text-100 text-base lg:pr-14">
                Access everything you need to design, prototype, collaborate,
                and launch — all from one streamlined platform built for
                creative efficiency.
              </p>
              <div className="mt-10 flex w-full flex-col gap-4 sm:flex-row">
                <Button>
                  <a href="javascript:void(0)">Get Started for Free</a>
                </Button>
                <Button appearance="outline">
                  <a href="javascript:void(0)">Live Demo</a>
                </Button>
              </div>
              <div className="mt-12 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:mt-24">
                <div>
                  <Gear1 className="text-primary-500 size-6" />
                  <h2 className="text-title-50 mt-6 mb-3 text-2xl font-medium">
                    Smart Automation
                  </h2>
                  <p className="text-text-100 text-base">
                    Save time with intelligent workflows that handle repetitive
                    tasks for you.
                  </p>
                </div>
                <div>
                  <PieChart1 className="text-primary-500 size-6" />
                  <h2 className="text-title-50 mt-6 mb-3 text-2xl font-medium">
                    Easy Data Manager
                  </h2>
                  <p className="text-text-100 text-base">
                    Save time with intelligent workflows that handle repetitive
                    tasks for you.
                  </p>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2">
              <div>
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-05/Image-1.jpg"
                  className="mx-auto rounded-xl"
                  alt="dashboard"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
