import { Button } from '@/components/core/button';

const image =
  'https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-01/Image.jpg';

export default function About1() {
  return (
    <section className="bg-background-50 py-10 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="flex flex-col items-center gap-0 lg:flex-row">
          <div className="lg:w-1/2">
            <div className="px-2.5 py-10 sm:p-16">
              <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
                About us
              </span>
              <h2 className="text-title-50 mb-4 text-3xl font-semibold sm:text-4xl">
                Empowering businesses <br />
                with Tailgrids
              </h2>
              <p className="text-text-100 text-base">
                TailGrids is a comprehensive collection of pre-built UI
                components and templates, built on top of Tailwind CSS. Whether
                you're building landing pages, SaaS dashboards, or marketing
                websites.
              </p>

              <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row">
                <Button variant="primary">
                  <a href="javascript:void(0)">Get Started</a>
                </Button>
                <Button appearance="outline">
                  <a href="javascript:void(0)">Learn More</a>
                </Button>
              </div>
            </div>
          </div>
          <div className="lg:w-1/2">
            <div className="p-2.5">
              <img
                src={image}
                className="w-full rounded-xl"
                alt="About TailGrids - team working together"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
