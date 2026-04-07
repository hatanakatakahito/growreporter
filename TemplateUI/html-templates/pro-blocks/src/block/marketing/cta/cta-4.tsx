import { Button } from '@/components/core/button';

export default function Cta4() {
  return (
    <section className="bg-background-soft-100 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="bg-background-50 overflow-hidden rounded-2xl p-2">
          <div className="flex flex-col lg:flex-row">
            {/* Left Image Section */}
            <div className="w-full md:w-5/12">
              <div className="h-full">
                <img
                  src=" https://cdn-tailgrids.b-cdn.net/3.0/marketing/cta/cta-04/image.jpg"
                  alt="Person working at desk"
                  className="h-full w-full rounded-xl object-cover"
                />
              </div>
            </div>

            {/* Right Content Section */}
            <div className="flex w-full flex-col justify-center p-4 lg:w-7/12 lg:p-12 xl:p-16">
              <h2 className="text-title-50 mb-4 text-4xl leading-tight font-semibold sm:text-5xl">
                Built for Startups That Want To Move Fast
              </h2>

              <p className="text-text-100 text-base">
                From early-stage to scale-up, Untitled gives you the tools to
                stay focused, efficient, and ahead of the curve — no bloat, just
                results.
              </p>

              <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
                <Button>
                  <a href="javascript:void(0)">Get Started</a>
                </Button>
                <Button appearance="outline">
                  <a href="javascript:void(0)"> Learn More</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
