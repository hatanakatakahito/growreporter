import { StarIcon } from '@tailgrids/icons';

interface Testimonial {
  name: string;
  handle: string;
  avatar: string;
  rating: number;
  text: string;
}

const testimonials: Testimonial[] = [
  {
    name: 'Kathryn Murphy',
    handle: '@kath5',
    avatar:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-08/avatar-1.png',
    rating: 5,
    text: '"Working with this team has been a game-changer — their attention to detail, creativity, and commitment',
  },
  {
    name: 'Wade Warren',
    handle: '@wadeui',
    avatar:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-08/avatar-2.png',
    rating: 5,
    text: '"Working with this team has been a game-changer — their attention to detail, creativity, and commitment',
  },
  {
    name: 'Nina Alvarez',
    handle: '@ninaal',
    avatar:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-08/avatar-3.png',
    rating: 5,
    text: '"Working with this team has been a game-changer — their attention to detail, creativity, and commitment',
  },
];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <article className="border-base-100 border-l px-8 py-7">
      <div className="flex items-start justify-between pb-5">
        <div className="flex items-center gap-3">
          <img
            src={testimonial.avatar}
            className="h-10 w-10 shrink-0 rounded-full"
            alt={testimonial.name}
          />
          <div>
            <h3 className="text-text-50 text-sm font-semibold">
              {testimonial.name}
            </h3>
            <span className="text-text-100 text-sm">{testimonial.handle}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {[...Array(testimonial.rating)].map((_, i) => (
            <StarIcon key={i} className="size-3.5 text-yellow-400" />
          ))}
        </div>
      </div>
      <p className="text-text-100 pt-5 font-normal">{testimonial.text}</p>
    </article>
  );
}

export default function Testimonial8() {
  return (
    <section className="bg-background-50 py-14 lg:py-28">
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
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
