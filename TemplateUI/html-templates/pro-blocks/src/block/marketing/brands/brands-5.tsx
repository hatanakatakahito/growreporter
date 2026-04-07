import { StarIcon } from '@tailgrids/icons';

const brands = [
  {
    brandLogo:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/logo-1.svg',
    brandLogoWhite:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/logo-1-white.svg',
  },
  {
    brandLogo:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/logo-2.svg',
    brandLogoWhite:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/logo-2-white.svg',
  },
  {
    brandLogo:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/logo-3.svg',
    brandLogoWhite:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/logo-3-white.svg',
  },
  {
    brandLogo:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/logo-4.svg',
    brandLogoWhite:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/logo-4-white.svg',
  },
  {
    brandLogo:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/logo-5.svg',
    brandLogoWhite:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/logo-5-white.svg',
  },
];

export default function Brands5() {
  return (
    <div className="py-10 lg:py-20">
      <section className="bg-background-soft-100 relative py-16 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 xl:px-0">
          <div className="flex flex-col gap-10 lg:flex-row lg:gap-20">
            <div className="lg:w-5/12">
              <h2 className="text-title-50 mb-5 text-center text-3xl font-semibold lg:text-start">
                Trusted by 10,000 Developer worldwide
              </h2>
              <div className="flex items-center justify-center gap-3 lg:justify-start">
                <div className="flex items-center -space-x-3">
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/avatar-1.png"
                    className="ring-background-50 h-10 w-10 rounded-full ring"
                    alt=""
                  />
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/avatar-2.png"
                    className="ring-background-50 h-10 w-10 rounded-full ring"
                    alt=""
                  />
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/avatar-3.png"
                    className="ring-background-50 h-10 w-10 rounded-full ring"
                    alt=""
                  />
                </div>
                <div className="flex items-center gap-1">
                  <StarIcon className="size-4 text-yellow-500" />
                  <p className="text-text-100 text-base font-medium">
                    4.8 star product review
                  </p>
                </div>
              </div>
            </div>
            <div className="lg:w-7/12">
              <div className="flex flex-wrap justify-center gap-10">
                {brands.map((brand, index) => (
                  <div key={index}>
                    <img src={brand.brandLogo} alt="" className="block" />
                    <img src={brand.brandLogoWhite} alt="" className="hidden" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
