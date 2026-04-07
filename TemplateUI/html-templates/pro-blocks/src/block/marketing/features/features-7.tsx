import { ArrowRight } from '@tailgrids/icons';

export default function Features7() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="bg-primary-500/5 text-primary-500 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Features
          </span>
          <h2 className="text-title-50 mt-2 mb-4 text-4xl font-semibold sm:text-5xl">
            All Your Tools in One Smart, Intuitive Dashboard
          </h2>
          <p className="text-text-100 mx-auto max-w-2xl sm:px-24">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="space-y-6">
          <div className="bg-background-soft-100 flex flex-col gap-8 rounded-3xl p-3 sm:gap-11 lg:flex-row lg:items-center lg:p-4">
            <div className="w-full lg:w-1/2">
              <div className="border-base-100 bg-background-50 rounded-2xl p-5 lg:p-7">
                <img
                  src=" https://cdn-tailgrids.b-cdn.net/3.0/marketing/features/feature-07/image-2.jpg"
                  className="w-full rounded-xl"
                  alt=""
                />
              </div>
            </div>
            <div className="w-full lg:w-1/2">
              <div className="px-2 py-8 lg:px-10">
                <h2 className="text-title-50 mb-3 text-2xl font-semibold sm:text-3xl lg:pr-20">
                  A Dashboard Built for Performance, Clarity, and Control
                </h2>
                <p className="text-text-100 text-base">
                  From real-time analytics to user management, we’ve packed your
                  workspace with powerful features that simplify how you work
                  every day.
                </p>
                <a
                  href="javascript:void(0)"
                  className="text-primary-500 group mt-9 flex items-center gap-2 text-base font-medium sm:mt-24"
                >
                  Learn More
                  <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          </div>
          <div className="bg-background-soft-100 flex flex-col gap-8 rounded-3xl p-3 sm:gap-11 lg:flex-row lg:items-center lg:p-4">
            <div className="order-2 w-full lg:order-1 lg:w-1/2">
              <div className="px-2 py-8 lg:px-10">
                <h2 className="text-title-50 mb-3 text-2xl font-semibold sm:text-3xl lg:pr-20">
                  The Central Hub for Managing, Monitoring, and Scaling Your
                  Work
                </h2>
                <p className="text-text-100 text-base">
                  Take control with an all-in-one dashboard that brings
                  visibility, customization, and action together in one seamless
                  interface.
                </p>
                <a
                  href="javascript:void(0)"
                  className="text-primary-500 group mt-9 flex items-center gap-2 text-base font-medium sm:mt-24"
                >
                  Learn More
                  <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </div>
            </div>
            <div className="order-1 w-full lg:order-2 lg:w-1/2">
              <div className="border-base-50 bg-background-50 rounded-2xl p-5 lg:p-7">
                <img
                  src=" https://cdn-tailgrids.b-cdn.net/3.0/marketing/features/feature-07/image-1.jpg"
                  className="w-full rounded-xl"
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
