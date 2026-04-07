const image =
  'https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-04/images.jpg';

export default function About4() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Some Info About Our Company
          </span>
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            We don’t just design. We tell stories.
          </h2>
          <p className="text-text-100 text-center text-base">
            Lorem Ipsum is simply dummy text of the printing and typesetting
            industry. Lorem Ipsum has been the industry's standard dummy text
          </p>
        </div>
        <div className="relative mb-8">
          <img src={image} className="w-full rounded-2xl" alt="" />
          <a
            href="javascript:void(0)"
            className="bg-foreground-soft-500/40 absolute top-1/2 left-1/2 flex h-30 w-30 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur-sm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="60"
              height="61"
              viewBox="0 0 60 61"
              fill="none"
            >
              <path
                d="M16.9375 13.9876L16.9375 47.0126C16.9375 49.3582 19.5084 50.7965 21.5073 49.5691L48.399 33.0566C50.306 31.8857 50.306 29.1145 48.399 27.9436L21.5073 11.4311C19.5084 10.2037 16.9375 11.642 16.9375 13.9876Z"
                fill="#F9FAFB"
              />
            </svg>
          </a>
        </div>
        <div className="bg-background-soft-100 divide-base-100 grid grid-cols-1 gap-10 divide-y rounded-2xl py-8 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3 lg:divide-x">
          <div className="px-12 pb-8 lg:pb-0">
            <h3 className="text-title-50 mb-3 text-2xl font-semibold">
              1. Conceptualize
            </h3>
            <p className="text-text-100">
              Lorem ipsum dolor sit amet consectetur. Risus mattis nam erat
              suscipit eget
            </p>
          </div>
          <div className="px-12 pb-8 lg:pb-0">
            <h3 className="text-title-50 mb-3 text-2xl font-semibold">
              2. Innovate
            </h3>
            <p className="text-text-100">
              Lorem ipsum dolor sit amet consectetur. Risus mattis nam erat
              suscipit eget
            </p>
          </div>
          <div className="px-12">
            <h3 className="text-title-50 mb-3 text-2xl font-semibold">
              3. Deliver
            </h3>
            <p className="text-text-100">
              Lorem ipsum dolor sit amet consectetur. Risus mattis nam erat
              suscipit eget
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
