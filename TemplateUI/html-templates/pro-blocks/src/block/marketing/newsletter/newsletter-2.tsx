import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';

export default function Newsletter2() {
  return (
    <section className="bg-background-50 relative overflow-hidden py-16 sm:py-0">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 lg:flex-row xl:items-center">
          <div className="w-full px-4 sm:p-10 lg:w-1/2 xl:p-20">
            <h2 className="text-title-50 mb-4 text-left text-4xl font-medium sm:text-6xl sm:leading-16">
              Get 10% Off <br /> Your First Order!
            </h2>
            <p className="text-text-100 text-left text-base">
              Join our newsletter and be the first to hear about new arrivals,
              exclusive deals, and style tips you’ll love.
            </p>
            <form className="mt-7">
              <div className="flex flex-col gap-4">
                <Input
                  type="text"
                  placeholder="Enter your email"
                  className="h-12"
                />
                <Button className="h-12 w-full">Subscribe & Save</Button>
              </div>
            </form>
            <div className="mt-5 space-x-1 lg:mt-16 xl:mt-36">
              <a href="javascript:void(0)" className="text-text-100 text-sm">
                Our terms and condition Privacy Policy
              </a>
              <span className="text-text-100 text-sm">|</span>
              <a href="javascript:void(0)" className="text-text-100 text-sm">
                Privacy Policy
              </a>
            </div>
          </div>
          <div className="w-full lg:w-1/2">
            <div className="p-3">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/newsletter/newsletter-02/girl.jpg"
                className="w-full rounded-2xl"
                alt="gril"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
