import { Button } from '@/components/core/button';
import { Check } from '@tailgrids/icons';

export default function Features4() {
  return (
    <section className="bg-background-50 py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:gap-12">
          <div className="w-full space-y-6 lg:w-1/2">
            <h1 className="text-title-50 mb-4 text-4xl font-semibold lg:text-5xl">
              Your Fitness Journey, Supercharged
            </h1>
            <p className="text-text-100 mb-10 lg:pr-28">
              There are many variations of available but the majority have
              suffered alteration in some form.
            </p>

            <ul className="mb-12 space-y-4">
              <li className="flex items-start">
                <div className="bg-primary-500 text-white-100 mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
                  <Check />
                </div>
                <span className="text-text-50 ml-2.5">
                  Get custom routines tailored.
                </span>
              </li>
              <li className="flex items-start">
                <div className="bg-primary-500 text-white-100 mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
                  <Check />
                </div>
                <span className="text-text-50 ml-2.5">
                  Monitor reps, sets, weight, and more.
                </span>
              </li>
              <li className="flex items-start">
                <div className="bg-primary-500 text-white-100 mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
                  <Check />
                </div>
                <span className="text-text-50 ml-2.5">
                  Connect with a supportive community.
                </span>
              </li>
            </ul>

            <div className="flex flex-wrap gap-4 pt-2">
              <Button>
                <a href="javascript:void(0)">Get Started</a>
              </Button>{' '}
              <Button appearance="outline">
                <a href="javascript:void(0)"> Learn More</a>
              </Button>
            </div>
          </div>

          <div className="relative w-full lg:w-1/2">
            <div className="bg-background-soft-200 relative rounded-2xl">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/features/feature-04/image-2.jpg"
                className="w-full rounded-xl"
                alt=""
              />
              <div className="bg-background-50 absolute top-1/2 left-0 hidden -translate-x-1/4 -translate-y-1/2 transform rounded-xl lg:block">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/features/feature-04/image-1.png"
                  className="w-full rounded-xl shadow-2xl"
                  alt=""
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
