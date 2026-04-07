import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { ChevronLeft, ChevronRight } from '@tailgrids/icons';
// Import Swiper styles
//@ts-ignore
import 'swiper/css';
import { Button } from '@/components/core/button';

export default function ImageGallery7() {
  const [mainSwiper, setMainSwiper] = useState<SwiperType | null>(null);
  const [isBeginning, setIsBeginning] = useState<boolean>(true);
  const [isEnd, setIsEnd] = useState<boolean>(false);

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
        <div className="relative mx-auto max-w-[1008px]">
          <div className="space-y-5 md:space-y-6">
            {/* Main slider */}
            <div className="relative">
              <Swiper
                className="h-[490px]"
                onSwiper={(swiper) => {
                  setMainSwiper(swiper);
                  setIsBeginning(swiper.isBeginning);
                  setIsEnd(swiper.isEnd);
                }}
                onSlideChange={(swiper) => {
                  setIsBeginning(swiper.isBeginning);
                  setIsEnd(swiper.isEnd);
                }}
                slidesPerView={1}
                spaceBetween={0}
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

              {/* custom controls (prev / next) */}
              <div className="absolute inset-0 z-50 flex items-center justify-between px-3">
                <Button
                  iconOnly
                  appearance="outline"
                  size="sm"
                  aria-label="Previous"
                  className="bg-background-50 text-title-50 rounded-full"
                  onClick={() => mainSwiper?.slidePrev()}
                  disabled={!mainSwiper || images.length <= 1 || isBeginning}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  iconOnly
                  appearance="outline"
                  size="sm"
                  aria-label="Next"
                  className="bg-background-50 text-title-50 rounded-full"
                  onClick={() => mainSwiper?.slideNext()}
                  disabled={!mainSwiper || images.length <= 1 || isEnd}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>

            {/* custom controls moved into slider wrapper */}
          </div>
        </div>
      </div>
    </section>
  );
}
