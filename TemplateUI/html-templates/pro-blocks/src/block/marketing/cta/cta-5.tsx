import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';

export default function Cta5() {
  return (
    <section className="bg-background-soft-100 py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="bg-background-50 overflow-hidden rounded-2xl p-5 sm:p-10">
          <div className="from-background-soft-100 to-background-50 rounded-2xl bg-linear-to-b p-5 sm:p-11">
            <div className="mx-auto max-w-lg">
              <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
                Join our creator community for free resources
              </h2>
              <p className="text-text-100 mt-4 text-center">
                Powerful tools and insights to help your startup streamline
                operations, boost performance, and accelerate
              </p>
              <form className="mt-10">
                <div className="mx-auto flex max-w-[460px] flex-col gap-3 sm:flex-row">
                  <Input
                    type="text"
                    placeholder="Enter Your Email"
                    className="w-full"
                  />
                  <Button>Subscribe</Button>
                </div>
                <p className="text-text-100 mt-3 text-center text-xs">
                  We don’t Spam, We care about our user.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
