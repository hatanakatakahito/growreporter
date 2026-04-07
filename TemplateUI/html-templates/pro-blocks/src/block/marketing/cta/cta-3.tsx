import { Button } from '@/components/core/button';

const brands = [
  {
    name: 'Loom',
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-04/loom.svg',
    position: 'top-[144px] left-[94px]',
  },
  {
    name: 'Facebook',
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-04/facebook.svg',
    position: 'bottom-[106px] left-[78px]',
  },
  {
    name: 'Gitlab',
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-04/gitlab.svg',
    position: 'bottom-[34px] left-[195px]',
  },
  {
    name: 'Figma',
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-04/figma.svg',
    position: 'top-[45px] right-[164px]',
  },
  {
    name: 'Slack',
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-04/slack.svg',
    position: 'right-[184px] bottom-[180px]',
  },
  {
    name: 'Google',
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-04/google.svg',
    position: 'right-[49px] bottom-[180px]',
  },
];

export default function Cta3() {
  return (
    <section className="bg-background-soft-100 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="bg-background-50 relative overflow-hidden rounded-3xl px-5 py-28">
          <div className="mx-auto flex max-w-[680px] flex-col items-center">
            <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
              Built for Startups That Want To Move Fast
            </h2>
            <p className="text-text-100 text-center text-base sm:px-10">
              From early-stage to scale-up, Untitled gives you the tools to stay
              focused, efficient, and ahead of the curve — no bloat, just
              results.
            </p>
            <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:flex-row">
              <Button>
                <a href="javascript:void(0)">Get Started Now</a>
              </Button>
              <Button appearance="outline">
                <a href="javascript:void(0)"> Learn more about us</a>
              </Button>
            </div>
          </div>
          <div className="hidden xl:block">
            {brands.map((brand, index) => (
              <span
                key={index}
                className={`bg-background-50 absolute inline-flex h-18 w-18 items-center justify-center rounded-full shadow-md ${brand.position}`}
              >
                <img src={brand.src} alt={brand.name} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
