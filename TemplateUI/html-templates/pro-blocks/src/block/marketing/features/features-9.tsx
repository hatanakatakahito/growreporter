export default function Features9() {
  return (
    <section className="bg-background-soft-100 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-lg text-center">
          <h2 className="text-title-50 mb-2 text-center text-4xl font-semibold sm:text-5xl">
            From Signup to Scaling in Minutes
          </h2>
          <p className="text-text-100 text-center text-base">
            Your all-in-one SaaS platform to onboard users, manage workflows,
            and grow your business—effortlessly.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* <!-- Card 1 --> */}
          <div className="space-y-8">
            <div className="bg-background-50 relative flex h-[324px] items-center justify-center rounded-3xl p-9">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/features/feature-09/image-1.png"
                alt="Person with headphones"
                className=""
              />
            </div>
            <h3 className="text-title-50 mb-3 text-2xl font-semibold">
              Ask What You Need
            </h3>
            <p className="text-text-100 text-base">
              There are many variations of available but the majority
              havesuffered
            </p>
          </div>
          {/* <!-- Card 2 --> */}
          <div className="space-y-8">
            <div className="bg-background-50 relative flex h-[324px] items-center justify-center rounded-3xl p-9">
              <img
                src=" https://cdn-tailgrids.b-cdn.net/3.0/marketing/features/feature-09/image-2.png"
                alt="Person with headphones"
                className=" "
              />
            </div>
            <h3 className="text-title-50 mb-3 text-2xl font-semibold">
              Manage your task flow
            </h3>
            <p className="text-ext-100 text-text-100 text-base">
              There are many variations of available but the majority
              havesuffered
            </p>
          </div>
          {/* <!-- Card 3 --> */}
          <div className="space-y-8">
            <div className="bg-background-50 relative flex h-[324px] items-center justify-center rounded-3xl p-9">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/features/feature-09/image-3.png"
                alt="Person with headphones"
                className="w-full rounded-2xl"
              />
            </div>
            <h3 className="text-title-50 mb-3 text-2xl font-semibold">
              Track, Learn, and Grow
            </h3>
            <p className="text-text-100 text-base">
              There are many variations of available but the majority
              havesuffered
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
