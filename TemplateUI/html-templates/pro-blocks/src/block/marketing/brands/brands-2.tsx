import { Button } from '@/components/core/button';

const brands = [
  {
    brandLogo:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-02/logo-1.svg',
    brandLogoWhite:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-02/logo-1-white.svg',
  },
  {
    brandLogo:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-02/logo-2.svg',
    brandLogoWhite:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-02/logo-2-white.svg',
  },
  {
    brandLogo:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-02/logo-3.svg',
    brandLogoWhite:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-02/logo-3-white.svg',
  },
  {
    brandLogo:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-02/logo-4.svg',
    brandLogoWhite:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-02/logo-4-white.svg',
  },
  {
    brandLogo:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-02/logo-5.svg',
    brandLogoWhite:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-02/logo-5-white.svg',
  },
  {
    brandLogo:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-02/logo-6.svg',
    brandLogoWhite:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-02/logo-6-white.svg',
  },
];

export default function Brands2() {
  return (
    <section className="bg-background-50 py-10 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-20">
          <div className="lg:w-4/12">
            <h2 className="text-title-50 mb-4 text-3xl font-semibold sm:text-4xl">
              4,000+ startups grow with TailGrids
            </h2>
            <p className="text-text-100 text-base">
              There are many variations of available but the majority have
              suffered alteration in some form.
            </p>

            <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row">
              <Button>
                <a href="javascript:void(0)">Get Started</a>
              </Button>

              <Button appearance="outline">
                <a href="javascript:void(0)">Learn More</a>
              </Button>
            </div>
          </div>
          <div className="lg:w-8/12">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((brand, index) => {
                const alt = `Brand ${index + 1} logo`;
                return (
                  <div
                    key={index}
                    className="bg-background-soft-50 rounded-lg p-10"
                  >
                    <img
                      src={brand.brandLogo}
                      className="block w-full"
                      alt={alt}
                    />
                    <img
                      src={brand.brandLogoWhite}
                      className="hidden w-full"
                      alt={alt + ' (white)'}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
