const image =
  'https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-03/image-1.png';
const imageTwo =
  'https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-03/image-2.png';

export default function About3() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-lg text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            About us
          </span>
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            What Drives Us
          </h2>
          <p className="text-text-100 text-center text-base">
            We create flexible, developer-friendly UI components powered by
            Tailwind CSS. From startups to enterprise apps
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-10">
          <div className="bg-background-soft-100 rounded-xl p-5 sm:p-10">
            <h3 className="text-title-50 mb-3.5 text-2xl font-semibold sm:text-4xl">
              Our Product
            </h3>
            <p className="text-text-100 mb-10 text-base">
              To empower developers and designers by providing high-quality,
              reusable UI components built with Tailwind CSS—enabling faster,
              more consistent, and scalable web development.
            </p>
            <div className="bg-background-soft-50 rounded-2xl p-7">
              <img src={image} className="w-full" alt="" />
            </div>
          </div>
          <div className="bg-background-soft-100 rounded-xl p-5 sm:p-10">
            <h3 className="text-title-50 mb-3.5 text-2xl font-semibold sm:text-4xl">
              Our Mission
            </h3>
            <p className="text-text-100 mb-10 text-base">
              To become the go-to UI resource for modern web
              builders—simplifying design systems and accelerating product
              development across the web development.
            </p>
            <div className="bg-background-soft-50 rounded-2xl p-7">
              <img src={imageTwo} className="w-full" alt="" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
