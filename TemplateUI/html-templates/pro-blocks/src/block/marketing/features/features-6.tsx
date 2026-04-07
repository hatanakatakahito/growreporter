export default function Features6() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <h2 className="text-title-50 mb-2 text-center text-4xl font-semibold sm:text-5xl">
            Everything You Need to Grow Smarter
          </h2>
          <p className="text-text-100 text-center text-base sm:px-20">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          {/* <!-- Card 01 - With Image and Overlay --> */}
          <div className="relative max-h-[250px] min-h-[250px] overflow-hidden rounded-2xl lg:col-span-2">
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/marketing/features/feature-06/image.jpg"
              alt="Person with headphones"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="from-primary-500 to-primary-500/10 absolute inset-0 flex h-full flex-col bg-linear-to-r p-10">
              <div>
                <h2 className="text-white-100 mb-4 text-2xl font-semibold">
                  01
                </h2>
                <h3 className="text-white-100 mb-3.5 text-2xl font-semibold">
                  Classic & Clean
                </h3>
                <p className="text-white-80 text-base">
                  Lorem ipsum dolor sit amet consectetur. Sagittis mattis est
                  enim in aliquet e
                </p>
              </div>
            </div>
          </div>

          {/* <!-- Card 02 - Dark Gray Background --> */}
          <div className="bg-foreground-100 flex min-h-[250px] flex-col rounded-2xl p-10">
            <div>
              <h2 className="text-white-100 mb-4 text-2xl font-semibold">02</h2>
              <h3 className="text-white-100 mb-3.5 text-2xl font-semibold">
                Read. Learn. Grow.
              </h3>
              <p className="text-white-80 text-base">
                Lorem ipsum dolor sit amet consectetur. Sagittis mattis est enim
                in aliquet e
              </p>
            </div>
          </div>

          {/* <!-- Card 03 - Dark Blue Background --> */}
          <div className="bg-primary-950 flex min-h-[250px] flex-col rounded-2xl p-10">
            <div>
              <h2 className="text-white-100 mb-4 text-2xl font-semibold">03</h2>
              <h3 className="text-white-100 mb-3.5 text-2xl font-semibold">
                Bold & Engaging
              </h3>
              <p className="text-white-80 text-base">
                Lorem ipsum dolor sit amet consectetur. Sagittis mattis est enim
                in aliquet e
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
