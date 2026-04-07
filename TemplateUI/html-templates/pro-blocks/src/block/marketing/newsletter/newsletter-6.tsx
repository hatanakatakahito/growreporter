import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';
import { Xmark2x } from '@tailgrids/icons';

export default function Newsletter6() {
  return (
    <section className="bg-background-soft-100 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto max-w-[500px] overflow-hidden rounded-2xl">
          <div className="relative">
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/marketing/newsletter/newsletter-06/image.jpg"
              className="w-full rounded-t-2xl object-cover"
              alt=""
            />
            <Button
              iconOnly
              variant="ghost"
              className="bg-background-50 absolute top-5 right-5 inline-flex h-10 w-10 cursor-pointer"
            >
              <Xmark2x />
            </Button>
          </div>
          <div className="bg-background-50 px-5 py-7 sm:p-10">
            <h2 className="text-title-50 xm:text-4xl mb-2 text-3xl font-medium">
              Never Miss an Update Subscribe Now
            </h2>
            <p className="text-text-100 text-base leading-6">
              Lorem ipsum dolor sit amet consectetur. Vitae dignissim odio vitae
              praesent egestas sollicitudin
            </p>
            <div className="mt-7">
              <form>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Enter your email"
                      className="h-12 w-full"
                    />
                  </div>
                  <Button className="h-12 px-6">Subscribe</Button>
                </div>
              </form>
              <p className="text-text-100 mt-3 text-base">
                No spam. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
