import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';

export default function Newsletter5() {
  return (
    <section className="bg-background-50 relative overflow-hidden py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="relative z-20 mx-auto max-w-[548px]">
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            200+ businesses already growing with us
          </h2>
          <p className="text-text-100 text-center text-base">
            A quick peek at what I’ve been designing lately — plus some useful
            resources for fellow creatives.
          </p>
          <form className="mt-10 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Input
                type="text"
                placeholder="Enter your email"
                className="h-12 sm:w-[340px] lg:w-full"
              />
              <Button className="h-12 shrink-0 px-8">Sign Up</Button>
            </div>
          </form>
          <p className="text-text-100 mt-3 text-center text-base">
            We respect your privacy. No spam, ever.
          </p>
        </div>
      </div>
      {/* <!-- Shape --> */}
      <div className="bg-fourground-50">
        <img
          src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/newsletter/newsletter-05/shape-start.png"
          className="absolute top-0 bottom-0 left-0 block h-full sm:left-0"
          alt="shape"
        />{' '}
        <img
          src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/newsletter/newsletter-05/shape-start-dark.png"
          className="absolute top-0 bottom-0 hidden h-full sm:left-0"
          alt="shape-dark"
        />{' '}
        <img
          src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/newsletter/newsletter-05/shape-end.png"
          className="absolute top-0 right-0 bottom-0 block h-full sm:right-0"
          alt=""
        />{' '}
        <img
          src=" https://cdn-tailgrids.b-cdn.net/3.0/marketing/newsletter/newsletter-05/shape-end-dark.png"
          className="h-fll absolute top-0 right-0 bottom-0 hidden sm:right-0"
          alt=""
        />{' '}
      </div>
    </section>
  );
}
