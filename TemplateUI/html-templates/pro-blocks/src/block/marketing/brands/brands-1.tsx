const brands = [
  {
    brandLogo:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-01/logo-1.svg',
    brandLogoWhite:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-01/logo-1-white.svg',
  },
  {
    brandLogo:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-01/logo-2.svg',
    brandLogoWhite:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-01/logo-2-white.svg',
  },
  {
    brandLogo:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-01/logo-3.svg',
    brandLogoWhite:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-01/logo-3-white.svg',
  },
  {
    brandLogo:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-01/logo-4.svg',
    brandLogoWhite:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-01/logo-4-white.svg',
  },
  {
    brandLogo:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-01/logo-5.svg',
    brandLogoWhite:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-01/logo-5-white.svg',
  },
];

export default function Brands1() {
  return (
    <section className="bg-background-50 py-10 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-12">
          <p className="text-text-50 text-center text-xl font-medium">
            Trusted by 10,000 Companies worldwide
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-7 sm:gap-15">
          {brands.map((brand, index) => {
            const alt = `Brand ${index + 1} logo`;
            return (
              <div key={index}>
                <img src={brand.brandLogo} className="block w-full" alt={alt} />
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
    </section>
  );
}
