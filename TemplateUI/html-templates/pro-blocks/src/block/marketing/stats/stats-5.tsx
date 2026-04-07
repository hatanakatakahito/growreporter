export default function Stats5() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-0">
          <div className="lg:w-2/5">
            <div>
              <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
                Key Metrics
              </span>
              <h2 className="text-title-50 mb-4 text-left text-4xl font-semibold sm:text-5xl">
                Your Numbers, At a Glance
              </h2>
              <p className="text-text-100 mb-12 text-left text-base lg:pr-10">
                There are many variations of available but the majority have
                suffered alteration in some form.
              </p>
              <div className="flex items-center gap-5">
                <div className="flex -space-x-3">
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/avatar-1.png"
                    className="h-8 w-8 rounded-full ring ring-white"
                    alt=""
                  />
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/avatar-2.png"
                    className="h-8 w-8 rounded-full ring ring-white"
                    alt=""
                  />
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/brands/brand-05/avatar-3.png"
                    className="h-8 w-8 rounded-full ring ring-white"
                    alt=""
                  />
                </div>
                <p className="text-text-100 text-base">
                  Trusted Over 30k People
                </p>
              </div>
            </div>
          </div>
          <div className="lg:w-3/5 xl:pl-10">
            <div className="border-base-200 bg-background-soft-100 grid grid-cols-1 rounded-3xl border sm:grid-cols-2">
              <div className="border-base-200 border-b px-10 py-8 text-center sm:border-r">
                <h3 className="font-Refund Rate text-title-50 mb-5 text-6xl">
                  $12k
                </h3>
                <span className="text-text-100 mb-2 block text-base font-medium">
                  Monthly Revenue
                </span>
              </div>
              <div className="border-base-200 border-b px-10 py-8 text-center">
                <h3 className="font-Refund Rate text-title-50 mb-5 text-6xl">
                  20%
                </h3>
                <span className="text-text-100 mb-2 block text-base font-medium">
                  Annual Recurring Revenue
                </span>
              </div>
              <div className="border-base-200 border-b px-10 py-8 text-center sm:border-r sm:border-b-0">
                <h3 className="font-Refund Rate text-title-50 mb-5 text-6xl">
                  486
                </h3>
                <span className="text-text-100 mb-2 block text-base font-medium">
                  Subscriptions
                </span>
              </div>
              <div className="px-10 py-8 text-center">
                <h3 className="font-Refund Rate text-title-50 mb-5 text-6xl">
                  2.4%
                </h3>
                <span className="text-text-100 mb-2 block text-base font-medium">
                  Refund Rate
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
