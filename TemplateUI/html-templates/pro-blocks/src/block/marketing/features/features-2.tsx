export default function Features2() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="flex flex-col items-center gap-10 lg:flex-row">
          <div className="lg:w-7/12">
            <div className="mb-16 max-w-2xl">
              <span className="bg-primary-500/5 text-primary-500 mb-5 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
                Features
              </span>
              <h2 className="text-title-50 mb-2 text-left text-4xl font-semibold sm:text-5xl">
                Why Businesses Choose Us
              </h2>
              <p className="text-text-100 text-left text-base sm:pr-44">
                There are many variations of available but the majority have
                suffered alteration in some form.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-y-14 sm:grid-cols-2">
              <div className="border-base-100 flex items-baseline gap-4 pr-10 sm:border-r">
                <div>
                  <div className="bg-primary-500 ring-primary-100 h-2 w-2 rounded-full ring-3"></div>
                </div>
                <div>
                  <h3 className="text-title-50 mb-2 text-lg font-semibold">
                    Data-Driven Insights
                  </h3>
                  <p className="text-text-100 text-sm">
                    Make smarter decisions with real-time analytics and
                    performance tracking.
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-4 sm:pl-10">
                <div>
                  <div className="bg-primary-500 ring-primary-100 h-2 w-2 rounded-full ring-3"></div>
                </div>
                <div>
                  <h3 className="text-title-50 mb-2 text-lg font-semibold">
                    Scalable Solutions
                  </h3>
                  <p className="text-text-100 text-sm">
                    Whether you’re a startup or an enterprise, our tools grow
                    with your business.
                  </p>
                </div>
              </div>
              <div className="border-base-100 flex items-baseline gap-4 pr-10 sm:border-r">
                <div>
                  <div className="bg-primary-500 ring-primary-100 h-2 w-2 rounded-full ring-3"></div>
                </div>
                <div>
                  <h3 className="text-title-50 mb-2 text-lg font-semibold">
                    Advanced Security
                  </h3>
                  <p className="text-text-100 text-sm">
                    Enterprise-grade protection with end-to-end encryption and
                    secure cloud storage.
                  </p>
                </div>
              </div>
              <div className="flex items-baseline gap-4 sm:pl-10">
                <div>
                  <div className="bg-primary-500 ring-primary-100 h-2 w-2 rounded-full ring-3"></div>
                </div>
                <div>
                  <h3 className="text-title-50 mb-2 text-lg font-semibold">
                    24/7 Support
                  </h3>
                  <p className="text-text-100 text-sm">
                    Our expert team is always here — chat, email, or call
                    anytime you need help.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:w-5/12">
            <div>
              <img
                src=" https://cdn-tailgrids.b-cdn.net/3.0/marketing/features/feature-02/image.jpg"
                className="rounded-2xl"
                alt=""
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
