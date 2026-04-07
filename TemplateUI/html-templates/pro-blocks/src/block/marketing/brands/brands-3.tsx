import { ArrowAngularTopRight } from '@tailgrids/icons';

const brands = [
  {
    brandLogo:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-03/logo-1.svg',
    brandLogoWhite:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-03/logo-1-white.svg',
    description: 'There are many variations of available but the majority',
    href: 'href',
  },
  {
    brandLogo:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-03/logo-2.svg',
    brandLogoWhite:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-03/logo-2-white.svg',
    description: 'There are many variations of available but the majority',
    href: 'href',
  },
  {
    brandLogo:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-03/logo-3.svg',
    brandLogoWhite:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-03/logo-3-white.svg',
    description: 'There are many variations of available but the majority',
    href: 'href',
  },
  {
    brandLogo:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-03/logo-4.svg',
    brandLogoWhite:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-03/logo-4-white.svg',
    description: 'There are many variations of available but the majority',
    href: 'href',
  },
];

export default function Brands3() {
  return (
    <section className="bg-background-50 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
            Proud to Work With These Amazing Brands
          </h2>
          <p className="text-text-100 text-base lg:px-5">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {brands.map((brand, index) => (
            <div
              key={index}
              className="bg-background-soft-50 border-base-100 group rounded-xl border px-6 py-9"
            >
              <div className="mb-9 flex items-center justify-between">
                <img
                  src={brand.brandLogo}
                  alt={`Brand ${index + 1} logo`}
                  className="block"
                />
                <img
                  src={brand.brandLogoWhite}
                  alt={`Brand ${index + 1} logo (white)`}
                  className="hidden"
                />
                <a
                  href={brand.href}
                  className="text-text-50 group-hover:text-primary-500 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                >
                  <ArrowAngularTopRight className="size-6" />
                </a>
              </div>
              <p className="text-text-100 text-base">{brand.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
