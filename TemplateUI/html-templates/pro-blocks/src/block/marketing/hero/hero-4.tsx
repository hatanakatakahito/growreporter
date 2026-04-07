import { Button } from '@/components/core/button';
import { StarIcon } from '@tailgrids/icons';
import Navbar1 from '../navbar/navbar-1';

export default function Hero4() {
  return (
    <div className="bg-background-50 min-h-screen">
      <Navbar1 />
      <section className="bg-background-50 relative mx-auto max-w-[1440px] py-14 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 xl:px-0">
          <div className="flex flex-col gap-11 lg:flex-row lg:items-center lg:gap-20">
            <div className="lg:w-1/2">
              <div>
                <h1 className="text-title-50 smtext-5xl mb-5 text-4xl font-semibold xl:pr-52">
                  Turn Sales Data into Revenue-Driving Decisions.
                </h1>
                <p className="text-text-100 text-base xl:pr-40">
                  Visualize performance, track KPIs, and uncover hidden
                  opportunities with real-time dashboards and reports.
                </p>
                <div className="mt-8 flex w-full flex-col gap-4 sm:mt-10 sm:flex-row">
                  <Button>Get Insights</Button>
                  <Button appearance="outline">Live Demo</Button>
                </div>
                <div className="mt-12 flex items-center gap-3.5">
                  <div className="flex -space-x-3">
                    <img
                      src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-04/avatar-1.png"
                      className="ring-background-50 h-10 w-10 rounded-full ring"
                      alt="avatar"
                    />
                    <img
                      src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-04/avatar-2.png"
                      className="ring-background-50 h-10 w-10 rounded-full ring"
                      alt="avatar"
                    />
                    <img
                      src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-04/avatar-3.png"
                      className="ring-background-50 h-10 w-10 rounded-full ring"
                      alt="avatar"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className="size-3.5 text-yellow-400"
                        />
                      ))}
                    </div>
                    <p className="text-text-100 text-xs">
                      Trusted by 20k+ User
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2">
              <div className="via-primary-500 to-primary-900 from-background-50 h-full w-full overflow-hidden rounded-2xl bg-linear-to-b px-18 pt-14">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-04/image-1.png"
                  className="mx-auto"
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
