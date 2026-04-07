import { Button } from '@/components/core/button';

export default function EcomHero3() {
  return (
    <section>
      <div className="mx-auto max-w-[1440px]">
        <div className="bg-background-soft-100 flex flex-col lg:flex-row lg:items-center">
          <div className="flex items-center justify-center lg:w-1/2">
            <div className="px-4 py-6 sm:px-12 xl:px-24">
              <p className="text-text-100 mb-4 flex items-center gap-1 text-xl">
                Modern living
                <span className="bg-text-100 inline-block h-px w-9"></span>
              </p>
              <h1 className="text-title-50 mb-5 text-4xl font-semibold sm:text-5xl">
                Define Your Space
              </h1>
              <p className="text-text-100 mb-5 text-base leading-6">
                Furniture that tells your story and transforms your home <br />
                into a personal sanctuary.
              </p>
              <a
                href="javascript:void(0)"
                className="text-title-50 mb-12 block font-medium"
              >
                Starts from $299
              </a>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-5">
                <Button>
                  <a href="javascript:void(0)">Shop The Look</a>
                </Button>

                <Button appearance="outline" className="bg-background-50-50">
                  <a href="javascript:void(0)"> Explore More</a>
                </Button>
              </div>
            </div>
          </div>
          <div className="bg-background-50-50 lg:w-1/2">
            <div>
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-03/chair.png"
                className=""
                alt=""
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
