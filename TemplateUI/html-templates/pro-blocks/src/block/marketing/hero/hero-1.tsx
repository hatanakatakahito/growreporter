import { Button } from '@/components/core/button';
import { Play, StarIcon } from '@tailgrids/icons';
import Navbar1 from '../navbar/navbar-1';

export default function Hero1() {
  return (
    <div className="bg-background-50 min-h-screen">
      <Navbar1 />
      <section className="bg-background-50 relative mx-auto max-w-[1440px] py-14 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 pb-7.5 xl:px-0">
          <div className="flex flex-col gap-11 lg:items-center xl:flex-row">
            <div className="xl:max-w-lg">
              <div className="mb-6 flex items-center gap-3.5">
                <div className="flex -space-x-3">
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-01/avatar-1.png"
                    className="ring-background-50 h-10 w-10 rounded-full ring"
                    alt="avatar"
                  />
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-01/avatar-2.png"
                    className="ring-background-50 h-10 w-10 rounded-full ring"
                    alt="avatar"
                  />
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-01/avatar-3.png"
                    className="ring-background-50 h-10 w-10 rounded-full ring"
                    alt="avatar"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} className="size-3.5 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-text-100 mt-1 text-xs">
                    Trusted by 20k+ User
                  </p>
                </div>
              </div>
              <h1 className="text-title-50 mb-5 text-4xl font-semibold sm:pr-20 sm:text-5xl">
                Track Business Performance in Real Time
              </h1>
              <p className="text-text-100 text-base sm:max-w-md">
                Lorem ipsum dolor sit amet consectetur. Nunc fringilla non
                bibendum arcu ultrices. Habitasse ut donec
              </p>
              <div className="mt-12 flex w-full flex-col gap-4 sm:flex-row">
                <Button>
                  <a href="javascript:void(0)">Get Started Free</a>
                </Button>
                <Button appearance="outline">
                  <Play />
                  Watch Trailer
                </Button>
              </div>
            </div>
            <div className="xl:w-1/2">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-01/image.jpg"
                className="right-0 block rounded-2xl lg:rounded-none lg:rounded-tl-[38px] xl:absolute xl:top-16"
                alt="dashboard"
              />
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-01/image-dark.png"
                className="right-0 hidden rounded-2xl lg:rounded-none lg:rounded-tl-[38px] xl:absolute xl:top-16"
                alt="dashboard"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
