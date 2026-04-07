import { Button } from '@/components/core/button';
import Navbar1 from '../navbar/navbar-1';

export default function Hero2() {
  return (
    <div className="bg-background-50 min-h-screen">
      <Navbar1 />
      <section className="bg-background-50 relative mx-auto max-w-[1440px] py-14 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 xl:px-0">
          <div className="flex flex-col gap-11 lg:items-center xl:flex-row">
            <div className="flex items-center xl:w-1/2">
              <div>
                <h1 className="text-title-50 mb-5 text-4xl leading-none font-medium sm:text-6xl sm:leading-16 lg:pr-20">
                  <span className="flex items-center gap-2">
                    Build Beautiful
                    <span className="mt-2 flex items-center -space-x-4">
                      <img
                        src=" https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-02/gr-1.png"
                        className="ring-background-50 h-11 w-11 rounded-full ring-3"
                        alt="product"
                      />
                      <img
                        src=" https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-02/gr-2.png"
                        className="ring-background-50 h-11 w-11 rounded-full ring-3"
                        alt="product"
                      />
                      <img
                        src=" https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-02/gr-3.png"
                        className="ring-background-50 h-11 w-11 rounded-full ring-3"
                        alt="product"
                      />
                    </span>
                  </span>
                  Products. Without the Bloat.
                </h1>
                <p className="text-text-100 max-w-lg text-base">
                  Lorem ipsum dolor sit amet consectetur. Risus elit vel
                  faucibus arcu. Pretium tellus tincidunt felis nulla vel quis
                  scelerisque nulla neque.
                </p>
                <div className="mt-12 flex w-full flex-col gap-4 sm:flex-row">
                  <Button size="sm">
                    <a href="javascript:void(0)">7 day free trail</a>
                  </Button>

                  <Button size="sm" appearance="outline">
                    <a href="javascript:void(0)"> Learn more</a>
                  </Button>
                </div>
              </div>
            </div>
            <div className="xl:w-1/2 xl:p-3">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-02/image-1.jpg"
                className="top-16 right-0 rounded-2xl"
                alt="abstract"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
