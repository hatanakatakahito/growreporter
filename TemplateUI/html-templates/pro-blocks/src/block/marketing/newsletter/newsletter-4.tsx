import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';

export default function Newsletter4() {
  return (
    <section className="bg-background-50 relative overflow-hidden py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center xl:gap-24">
          <div className="w-full sm:w-3/5 lg:w-2/5">
            <h2 className="text-title-50 mb-4 text-left text-4xl font-semibold sm:text-5xl xl:pr-5">
              Insights that matter, in your inbox.
            </h2>
            <p className="text-text-100 text-left text-base">
              There are many variations of available but the majority have
              suffered alteration in some form.
            </p>
            <form className="mt-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Input
                  type="text"
                  placeholder="Enter your email"
                  className="sm:w-[290px] lg:w-full"
                />
                <Button className="h-12">Subscribe</Button>
              </div>
            </form>
          </div>
          <div className="w-full lg:w-3/5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="bg-background-soft-100 rounded-3xl px-10 py-12">
                <h2 className="text-title-50 mb-8 text-5xl font-medium sm:text-6xl">
                  25K+
                </h2>
                <p className="text-text-100 text-base">
                  Designers, developers, and founders around the world.
                </p>
              </div>
              <div className="bg-foreground-soft-500 rounded-3xl px-10 py-12">
                <h2 className="text-background-50 mb-8 text-5xl font-medium sm:text-6xl">
                  92%
                </h2>
                <p className="text-background-soft-500 text-base">
                  Designers, developers, and founders around the world.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
