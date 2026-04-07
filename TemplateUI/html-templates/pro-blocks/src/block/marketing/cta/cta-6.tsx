import { Button } from '@/components/core/button';

const images = [
  {
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/marketing/cta/cta-06/image.jpg',
    className: 'hidden w-full rounded-xl lg:block',
  },
  {
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/marketing/cta/cta-06/image-2.jpg',
    className: 'hidden w-full rounded-xl lg:block',
  },
  {
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/marketing/cta/cta-06/image-3.jpg',
    className: 'w-full rounded-xl',
  },
  {
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/marketing/cta/cta-06/image-4.jpg',
    className: 'w-full rounded-xl',
  },
  {
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/marketing/cta/cta-06/image-5.jpg',
    className: 'hidden w-full rounded-xl xl:block',
  },
  {
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/marketing/cta/cta-06/image-6.jpg',
    className: 'hidden w-full rounded-xl xl:block',
  },
];

export default function Cta6() {
  return (
    <section className="bg-background-soft-100 py-28">
      <div className="relative mx-auto max-w-7xl px-4 xl:px-0">
        <div className="bg-background-50 rounded-3xl px-5 py-14">
          <div className="mx-auto flex max-w-[680px] flex-col items-center">
            <span className="from-background-50 text-text-50 to-background-soft-100 mb-4 inline-flex items-center gap-3 rounded-md bg-linear-to-r px-2 py-1 text-sm">
              <span className="bg-background-soft-500 h-1.5 w-1.5 rounded-full"></span>
              3 Spot Remaining
            </span>
            <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
              Limited-edition collections
            </h2>
            <p className="text-text-100 text-center text-base sm:px-5">
              From early-stage to scale-up, Untitled gives you the tools to stay
              focused, efficient, and ahead of the curve — no bloat, just
              results.
            </p>
            <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:flex-row">
              <Button>
                <a href="javascript:void(0)">Get Started</a>
              </Button>
              <Button appearance="outline">
                <a href="javascript:void(0)">Learn More</a>
              </Button>
            </div>
          </div>
          <div className="mt-20 flex items-end justify-center gap-3.5 sm:px-5">
            {images.map((image, index) => (
              <div key={index} className="relative">
                <img src={image.src} alt="" className={image.className} />
                <div className="to-background-50 absolute inset-0 h-full w-full rounded-xl bg-linear-to-b from-transparent"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
