import { HalfStarIcon, StarIcon } from '@tailgrids/icons';

export default function Testimonial1() {
  const testimonials = [
    {
      name: 'Kathryn Murphy',
      role: 'Ceo',
      text: '“Working with this team has been a game-changer — their attention to detail, creativity, and commitment to deadlines exceeded every expectation I had.”',
      stars: [true, true, true, true, true],
      authorImage:
        ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-01/avatar-1.png',
    },
    {
      name: 'Theresa Webb',
      role: 'Web Designer',
      text: '“What impressed me most wasn’t just the design, but how deeply they cared about delivering something that made a difference for our users.”',
      stars: [true, true, true, true, false],
      authorImage:
        ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-01/avatar-2.png',
    },
    {
      name: 'Kathryn Murphy',
      role: 'Ceo',
      text: '“From the initial consultation to the final delivery, the process was seamless and incredibly professional — I’ve never felt more confident in a partnership.”',
      stars: [true, true, true, true, true],
      authorImage:
        ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-01/avatar-3.png',
    },
  ];

  return (
    <section className="bg-background-soft-100 h-screen py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-16 max-w-md">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Testimonial
          </span>
          <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
            Hear from Our Happy Customers
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <article
              key={testimonial.name + index}
              className="bg-background-50 flex flex-col justify-between rounded-2xl p-6"
            >
              <div className="mb-6 flex items-center gap-1">
                {testimonial.stars.map((star, starIndex) =>
                  star ? (
                    <StarIcon
                      key={starIndex}
                      className="size-4 text-yellow-500"
                    />
                  ) : (
                    <HalfStarIcon
                      key={starIndex}
                      className="size-4 text-yellow-400"
                    />
                  ),
                )}
              </div>
              <p className="text-text-100 text-base">{testimonial.text}</p>
              <div className="mt-8 flex items-center gap-3">
                <img
                  src={testimonial.authorImage}
                  className="h-12 w-12 rounded-full"
                  alt=""
                />
                <div>
                  <h3 className="text-text-50 text-base font-semibold">
                    {testimonial.name}
                  </h3>
                  <span className="text-text-100">{testimonial.role}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
