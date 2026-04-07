import { Button } from '@/components/core/button';
import Navbar1 from '../navbar/navbar-1';

export default function Hero3() {
  return (
    <div className="bg-background-50 min-h-screen">
      <Navbar1 />
      <section className="bg-background-50 relative mx-auto max-w-[1440px] py-14 lg:py-28">
        <div className="sm:px-8">
          <div className="bg-background-50 relative overflow-hidden rounded-3xl pt-20">
            <div className="pointer-events-none">
              <img
                className="absolute top-0 -left-1/2 block xl:left-0"
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-03/glow-l-light.png"
                alt="glow"
              />
              <img
                className="absolute top-0 -left-1/2 hidden xl:left-0"
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-03/glow-l-dark.png"
                alt="glow"
              />
              <img
                className="absolute top-0 -right-1/2 hidden xl:right-0"
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-03/glow-r-dark.png"
                alt="glow"
              />
              <img
                className="absolute top-0 -right-1/2 block xl:right-0"
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-03/glow-r-light.png"
                alt="glow"
              />
            </div>
            <div className="relative z-5 mx-auto max-w-[980px] px-4 text-center sm:px-0">
              <h1 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-6xl lg:px-20">
                All your creative tools in one powerful platform.
              </h1>
              <p className="text-text-100 mx-auto max-w-lg text-center sm:px-4">
                A simple solution for building, launching, and managing your
                digital projects — without the noise.
              </p>
              <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:flex-row sm:items-center sm:gap-5">
                <Button>
                  <a href="javascript:void(0)">7 day free trail</a>
                </Button>
                <Button appearance="outline">
                  <a href="javascript:void(0)">Learn more</a>
                </Button>
              </div>
              <div className="mt-16">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-03/Image.jpg"
                  className="shadow-hero pointer-event-none block w-full rounded-[20px]"
                  alt="dashboard"
                />
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-03/Image-dark.jpg"
                  className="shadow-hero pointer-event-none hidden w-full rounded-[20px]"
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
