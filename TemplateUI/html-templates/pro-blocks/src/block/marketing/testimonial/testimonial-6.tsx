import { HalfStarIcon, StarIcon } from '@tailgrids/icons';

export default function Testimonial6() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-16 max-w-md">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Testimonial
          </span>
          <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
            Hear from Our Happy Customers
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          <article className="bg-background-soft-50 col-span-full flex flex-col rounded-3xl p-2.5 lg:flex-row lg:items-center lg:gap-14">
            <div className="order-2 px-3 py-5 sm:p-9 lg:order-1 lg:w-1/2">
              <span className="text-title-50 text-base font-semibold">
                Michelle Jensen
              </span>
              <p className="text-text-100 mb-6 text-base">
                Digital Strategy Director, Tailadmin
              </p>
              <div className="mb-8 flex items-center gap-0.5 lg:mb-12">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="size-3.5 text-yellow-400" />
                ))}
              </div>
              <p className="text-title-50 text-2xl">
                "Working with this team has been a game-changer — their
                attention to detail, creativity, and commitment to deadlines
                exceeded every expectation I had."
              </p>
            </div>
            <div className="order-1 lg:order-2 lg:w-1/2">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-06/image-large.jpg"
                className="w-full rounded-[20px]"
                alt=""
              />
            </div>
          </article>
          <article className="border-base-50 rounded-2xl border p-6">
            <div className="flex items-center gap-0.5">
              {[...Array(4)].map((_, i) => (
                <StarIcon key={i} className="size-3.5 text-yellow-400" />
              ))}
              <HalfStarIcon className="size-3.5 text-yellow-400" />
            </div>
            <p className="text-text-100 mt-4 text-base">
              The design was sleek, intuitive, and exactly what we needed.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-06/avatar-1.png"
                className="h-10 w-10 rounded-full"
                alt=""
              />
              <div>
                <h3 className="text-text-50 text-sm font-semibold">
                  Kathryn Murphy
                </h3>
                <span className="text-text-100 text-sm">Ceo & Founder</span>
              </div>
            </div>
          </article>
          <article className="border-base-50 rounded-2xl border p-6">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className="size-3.5 text-yellow-400" />
              ))}
            </div>
            <p className="text-text-100 mt-4 text-base">
              They truly understood our brand and transformed it visually.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-06/avatar-2.png"
                className="h-10 w-10 rounded-full"
                alt=""
              />
              <div>
                <h3 className="text-text-50 text-sm font-semibold">
                  Jerome Bell
                </h3>
                <span className="text-text-100 text-sm">
                  Marketing Coordinator
                </span>
              </div>
            </div>
          </article>
          <article className="border-base-50 rounded-2xl border p-6">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} className="size-3.5 text-yellow-400" />
              ))}
            </div>
            <p className="text-text-100 mt-4 text-base">
              Our app's engagement improved dramatically after the redesign
            </p>
            <div className="mt-8 flex items-center gap-3">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-06/avatar-3.png"
                className="h-10 w-10 rounded-full"
                alt=""
              />
              <div>
                <h3 className="text-text-50 text-sm font-semibold">
                  Web Designer
                </h3>
                <span className="text-text-100 text-sm">Web Designer</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
