import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import {
  ChevronLeft,
  ChevronRight,
  HalfStarIcon,
  StarIcon,
} from '@tailgrids/icons';

const testimonials = [
  {
    quote:
      'Working with this team has been a game-changer — their attention to detail, creativity, and commitment to deadlines exceeded every expectation I had.',
    name: 'Kathryn Murphy',
    role: 'CEO & Founder',
    avatar:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-02/avatar.png',
  },
  {
    quote:
      'Working with this team has been a game-changer — their attention to detail, creativity, and commitment to deadlines exceeded every expectation I had.',
    name: 'Kathryn Murphy',
    role: 'CEO & Founder',
    avatar:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-02/avatar.png',
  },
];

const Testimonial2 = () => {
  return (
    <section className="bg-background-50 py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        {/* Header */}
        <div className="mx-auto mb-11 max-w-md text-center sm:mb-16">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Testimonial
          </span>
          <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
            Hear from Our Happy Customers
          </h2>
        </div>

        <div className="relative mx-auto max-w-5xl">
          {/* Desktop Navigation */}
          <div className="hidden sm:block">
            <button className="swiper-button-prev text-title-50 border-base-200 absolute top-1/2 left-0 inline-flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border">
              <ChevronLeft className="size-6" />
            </button>
            <button className="swiper-button-next text-title-50 border-base-200 absolute top-1/2 right-0 inline-flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border">
              <ChevronRight className="size-6" />
            </button>
          </div>

          {/* Swiper Slider */}
          <div className="mx-auto max-w-3xl">
            <Swiper
              modules={[Navigation]}
              slidesPerView={1}
              navigation={{
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
              }}
              className="mySwiper"
            >
              {testimonials.map((t, i) => (
                <SwiperSlide key={i}>
                  <article className="flex flex-col items-center gap-7 sm:gap-10">
                    {/* Stars */}
                    <div className="flex items-center gap-1">
                      {[...Array(4)].map((_, i) => (
                        <StarIcon key={i} className="size-6 text-yellow-500" />
                      ))}
                      <HalfStarIcon className="size-6 text-yellow-400" />
                    </div>

                    {/* Quote */}
                    <p className="text-text-50 text-center text-base font-medium sm:text-2xl">
                      "{t.quote}"
                    </p>

                    {/* Author */}
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src={t.avatar}
                        alt={t.name}
                        className="h-12 w-12 rounded-full"
                      />
                      <div className="text-center">
                        <h3 className="text-text-50 text-base font-semibold">
                          {t.name}
                        </h3>
                        <span className="text-text-100">{t.role}</span>
                      </div>
                    </div>
                  </article>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {/* Mobile Nav */}
          <div className="mt-11 flex justify-center gap-4 lg:hidden">
            <button className="swiper-button-prev text-title-50 border-base-200 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border">
              <ChevronLeft className="size-5" />
            </button>
            <button className="swiper-button-next text-title-50 border-base-200 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border">
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonial2;
