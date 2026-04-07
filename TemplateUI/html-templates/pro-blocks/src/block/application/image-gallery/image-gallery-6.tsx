import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Thumbs } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
// Import Swiper styles
//@ts-ignore
import 'swiper/css';

export default function ImageGallery6() {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const images = [
    'https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-06/image-1.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-06/image-1.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-06/image-1.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-06/image-1.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-06/image-1.jpg',
  ];

  return (
    <section className="bg-background-50 min-h-screen py-20">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto max-w-[1008px]">
          <div className="space-y-5 md:space-y-6">
            {/* Main slider */}
            <div className="relative">
              <Swiper
                className="h-[490px]"
                modules={[Thumbs]}
                thumbs={{ swiper: thumbsSwiper }}
                slidesPerView={1}
                spaceBetween={0}
                onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
              >
                {images.map((src, i) => (
                  <SwiperSlide key={i}>
                    <div className="relative h-full overflow-hidden rounded-lg">
                      <img
                        src={src}
                        alt={`Gallery image ${i + 1}`}
                        className="h-full w-full object-cover"
                        loading={i === 0 ? 'eager' : 'lazy'}
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            {/* Thumbnails */}
            <div className="mt-4">
              <Swiper
                modules={[Thumbs]}
                watchSlidesProgress
                onSwiper={setThumbsSwiper}
                spaceBetween={24}
                slidesPerView={4}
                breakpoints={{
                  0: { slidesPerView: 3, spaceBetween: 24 },
                  640: { slidesPerView: 4, spaceBetween: 24 },
                }}
                className="h-32"
                role="region"
                aria-label="Gallery thumbnails"
              >
                {images.map((src, i) => (
                  <SwiperSlide key={i}>
                    <div
                      className={`h-full cursor-pointer overflow-hidden rounded-lg transition ${i === activeIndex ? 'opacity-100' : 'opacity-50'}`}
                    >
                      <img
                        src={src}
                        alt={`Thumbnail ${i + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
