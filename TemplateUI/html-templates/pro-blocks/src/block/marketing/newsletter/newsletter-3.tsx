import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';

export default function Newsletter3() {
  return (
    <section className="bg-background-50 relative overflow-hidden py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="flex flex-col gap-10 sm:flex-row lg:items-center xl:gap-24">
          <div className="w-full sm:w-1/2">
            <div className="from-primary-100 rounded-3xl bg-linear-to-r to-pink-100 pt-12">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/newsletter/newsletter-03/image.png"
                className="mx-auto"
                alt=""
              />
            </div>
          </div>
          <div className="w-full sm:w-1/2 xl:px-10">
            <h2 className="text-title-50 mb-4 pr-0 text-left text-4xl font-semibold sm:pr-10 sm:text-5xl sm:leading-[52px] xl:pr-20">
              Insights that matter, in your inbox.
            </h2>
            <p className="text-text-100 text-left text-base">
              There are many variations of available but the majority have
              suffered alteration in some form.
            </p>
            <form className="mt-7">
              <div className="flex flex-col gap-4">
                <Input
                  type="text"
                  placeholder="Enter your email"
                  className="h-12"
                />
                <Button className="h-12 w-full">Subscribe</Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
