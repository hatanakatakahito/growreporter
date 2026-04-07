import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import { Navigation } from 'swiper/modules';
import { ChevronLeft, ChevronRight } from '@tailgrids/icons';

const testimonials = [
  {
    id: 1,
    text: 'Working with this team has been a game-changer — their attention to detail, creativity, and commitment to deadlines exceeded every expectation I had.',
    name: 'Kathryn Murphy',
    role: 'Co-Founder',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-03/avatar-1.png',
  },
  {
    id: 2,
    text: 'After working with multiple agencies in the past, this was by far the smoothest and most rewarding design experience we’ve ever had, with multiple agencies.',
    name: 'Jerome Bell',
    role: 'Marketing Manager',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-03/avatar-2.png',
  },
  {
    id: 3,
    text: 'From the initial consultation to the final delivery, the process was seamless and incredibly professional — I’ve never felt more confident in a partnership.',
    name: 'Jenny Wilson',
    role: 'Medical Assistant',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-03/avatar-3.png',
  },
  {
    id: 4,
    text: 'Working with this team has been a game-changer — their attention to detail, creativity, and commitment to deadlines exceeded every expectation I had.',
    name: 'Kathryn Murphy',
    role: 'Co-Founder',
    image:
      'https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-03/avatar-1.png',
  },
];

export default function Testimonial3() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-16 flex flex-col justify-between sm:flex-row sm:items-end">
          <div className="max-w-md">
            <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
              Testimonial
            </span>
            <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
              Hear from Our Happy Customers
            </h2>
          </div>
          <div className="flex gap-4 sm:justify-center">
            <button className="swiper-button-prev border-base-200 text-title-50 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border">
              <ChevronLeft className="size-5" />
            </button>
            <button className="swiper-button-next border-base-200 text-title-50 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border">
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
        {/* Swiper */}
        <div>
          <Swiper
            className="mySwiper"
            spaceBetween={20}
            loop={false}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 2 },
              1200: { slidesPerView: 3 },
            }}
            navigation={{
              nextEl: '.swiper-button-next',
              prevEl: '.swiper-button-prev',
            }}
            modules={[Navigation]}
          >
            {testimonials.map((item) => (
              <SwiperSlide key={item.id}>
                <div className="bg-background-soft-50 space-y-2 rounded-2xl p-2">
                  <div className="bg-background-50 rounded-lg p-6">
                    <svg
                      className="text-text-100"
                      xmlns="http://www.w3.org/2000/svg"
                      width="36"
                      height="36"
                      viewBox="0 0 36 36"
                      fill="none"
                    >
                      <path
                        d="M5.53617 9.438C7.64067 7.1565 10.8252 6 14.9997 6H16.4997V10.2285L15.2937 10.47C13.2387 10.881 11.8092 11.6895 11.0442 12.876C10.6449 13.5151 10.4185 14.247 10.3872 15H14.9997C15.3975 15 15.779 15.158 16.0603 15.4393C16.3416 15.7206 16.4997 16.1022 16.4997 16.5V27C16.4997 28.6545 15.1542 30 13.4997 30H4.49967C4.10184 30 3.72031 29.842 3.43901 29.5607C3.1577 29.2794 2.99967 28.8978 2.99967 28.5V21L3.00417 16.6215C2.99067 16.455 2.70567 12.51 5.53617 9.438ZM29.9997 30H20.9997C20.6018 30 20.2203 29.842 19.939 29.5607C19.6577 29.2794 19.4997 28.8978 19.4997 28.5V21L19.5042 16.6215C19.4907 16.455 19.2057 12.51 22.0362 9.438C24.1407 7.1565 27.3252 6 31.4997 6H32.9997V10.2285L31.7937 10.47C29.7387 10.881 28.3092 11.6895 27.5442 12.876C27.1449 13.5151 26.9185 14.247 26.8872 15H31.4997C31.8975 15 32.279 15.158 32.5603 15.4393C32.8416 15.7206 32.9997 16.1022 32.9997 16.5V27C32.9997 28.6545 31.6542 30 29.9997 30Z"
                        fill="currentColor"
                      />
                    </svg>
                    <p className="text-text-100 mt-4 text-base">{item.text}</p>
                  </div>
                  <div className="bg-background-50 flex items-center gap-3 rounded-lg px-6 py-3.5">
                    <img
                      src={item.image}
                      className="h-12 w-12 rounded-full"
                      alt={item.name}
                    />
                    <div>
                      <h3 className="text-text-50 text-base font-semibold">
                        {item.name}
                      </h3>
                      <span className="text-text-100">{item.role}</span>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
