import { Button } from '@/components/core/button';
import { Xmark2x } from '@tailgrids/icons';
import { useState } from 'react';
import { Autoplay, EffectCoverflow } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-coverflow';

const testimonials = [
  {
    id: 1,
    quote:
      "From the initial consultation to the final delivery, the process was seamless and incredibly professional — I've never felt more confident in a partnership.",
    name: 'Kathryn Murphy',
    title: 'CEO',
    avatar:
      'https://cdn-tailgrids.b-cdn.net/3.0/application/paywall/avatar.png',
  },
  {
    id: 2,
    quote:
      "From the initial consultation to the final delivery, the process was seamless and incredibly professional — I've never felt more confident in a partnership.",
    name: 'Kathryn Murphy',
    title: 'CEO',
    avatar:
      'https://cdn-tailgrids.b-cdn.net/3.0/application/paywall/avatar-1.png',
  },
  {
    id: 3,
    quote:
      "From the initial consultation to the final delivery, the process was seamless and incredibly professional — I've never felt more confident in a partnership.",
    name: 'Kathryn Murphy',
    title: 'CEO',
    avatar:
      'https://cdn-tailgrids.b-cdn.net/3.0/application/paywall/avatar.png',
  },
  {
    id: 4,
    quote:
      "From the initial consultation to the final delivery, the process was seamless and incredibly professional — I've never felt more confident in a partnership.",
    name: 'Kathryn Murphy',
    title: 'CEO',
    avatar:
      'https://cdn-tailgrids.b-cdn.net/3.0/application/paywall/avatar-1.png',
  },
];

const StarRating = () => (
  <div className="mb-6 flex items-center gap-0.5">
    {Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 13 13"
        fill="none"
      >
        <path
          d="M6.44224 0.0664062C6.67166 0.0665071 6.88171 0.196677 6.98341 0.402307L8.64032 3.75935L12.345 4.29757C12.5721 4.33062 12.7611 4.49094 12.8322 4.7091C12.9029 4.92735 12.8432 5.16667 12.679 5.32688L9.99767 7.93944L10.6312 11.6304C10.67 11.8567 10.5772 12.0857 10.3915 12.2207C10.2058 12.3556 9.95929 12.3735 9.75606 12.2669L6.44224 10.5245L3.12841 12.2669C2.92518 12.3737 2.67875 12.3556 2.49295 12.2207C2.30739 12.0857 2.21357 11.8566 2.25232 11.6304L2.88484 7.93944L0.204507 5.32688C0.0405464 5.16663 -0.0184606 4.92721 0.0522717 4.7091C0.123338 4.49088 0.312298 4.33062 0.539425 4.29757L4.24317 3.75935L5.90106 0.402307L5.94428 0.328644C6.05568 0.16607 6.24155 0.066465 6.44224 0.0664062Z"
          fill="#FACC15"
        />
      </svg>
    ))}
  </div>
);

export default function Paywall4() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background-50 relative w-full max-w-[700px] overflow-hidden rounded-3xl shadow-2xl">
        {/* Close Button */}
        <Button
          variant="ghost"
          iconOnly
          size="sm"
          className="absolute top-5 right-5 z-10"
          onClick={() => setIsOpen(false)}
        >
          <Xmark2x className="size-5" />
        </Button>

        {/* Content Container */}
        <div className="p-8 pt-12">
          <div className="mb-12">
            {/* Header */}
            <h2 className="text-title-50 mb-3 text-center text-4xl font-semibold">
              Unlock Premium Features
            </h2>
            <p className="text-text-100 text-center">
              You've reached a premium article/resource. To continue enjoying
              our in-depth analysis, expert insights you to become a subscriber.
            </p>
          </div>

          {/* Testimonials Slider */}
          <div className="mx-auto mb-8">
            <Swiper
              modules={[EffectCoverflow, Autoplay]}
              effect="coverflow"
              grabCursor={true}
              centeredSlides={true}
              slidesPerView="auto"
              loop={true}
              autoplay={{
                delay: 3000,
                disableOnInteraction: false,
              }}
              coverflowEffect={{
                rotate: 0,
                stretch: 0,
                depth: 100,
                modifier: 2.5,
                slideShadows: false,
              }}
              className="paywallSlider !overflow-visible"
            >
              {testimonials.map((testimonial) => (
                <SwiperSlide
                  key={testimonial.id}
                  className="!w-[280px] sm:!w-[320px]"
                >
                  <article className="bg-cover bg-center">
                    <div className="bg-background-50 rounded-2xl p-6 shadow-[0_19.62px_23.544px_-3.924px_rgba(16,24,40,0.08),_0_7.848px_7.848px_-3.924px_rgba(16,24,40,0.03)]">
                      {/* Rating */}
                      <StarRating />

                      {/* Text */}
                      <blockquote className="text-text-100 mb-5 text-base">
                        "{testimonial.quote}"
                      </blockquote>

                      {/* Profile */}
                      <div className="flex items-center gap-3">
                        <img
                          src={testimonial.avatar}
                          alt={testimonial.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div>
                          <h4 className="text-title-50 text-sm font-semibold">
                            {testimonial.name}
                          </h4>
                          <p className="text-text-100 text-xs">
                            {testimonial.title}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {/* CTA Button */}
          <Button className="h-12 w-full">See Our Price Plan</Button>

          {/* Guarantee Text */}
          <p className="text-text-100 mt-5 text-center text-sm">
            100% satisfaction guaranteed or your money back within 14 days.
          </p>
        </div>
      </div>
    </div>
  );
}
