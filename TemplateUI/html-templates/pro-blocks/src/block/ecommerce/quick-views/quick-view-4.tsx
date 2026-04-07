import { Button } from '@/components/core/button';
import {
  Bolt1,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightSmall,
  Heart,
  Minus,
  Plus,
  Xmark,
} from '@tailgrids/icons';
import { useState } from 'react';
import 'swiper/css';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

interface StarIconProps {
  filled?: boolean;
  className?: string;
}

const StarIcon = ({ filled, className }: StarIconProps) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_1288_12534)">
        <path
          d="M7.99998 1.90039C7.80044 1.90045 7.61563 1.99949 7.50486 2.16113L7.46189 2.23438L5.81346 5.57227L2.13084 6.10742C1.90501 6.14028 1.71712 6.29962 1.64646 6.5166C1.57614 6.73347 1.63481 6.97153 1.79783 7.13086L4.46287 9.72852L3.83396 13.3984C3.79543 13.6234 3.88872 13.8511 4.07322 13.9854C4.25796 14.1194 4.50299 14.1375 4.70506 14.0313L7.99998 12.2988L11.2949 14.0313C11.497 14.1375 11.742 14.1194 11.9267 13.9854C12.1113 13.8511 12.2035 13.6234 12.165 13.3984L11.5361 9.72852L14.2012 7.13086C14.3642 6.97153 14.4229 6.73347 14.3526 6.5166C14.2819 6.29962 14.094 6.14028 13.8682 6.10742L10.1856 5.57227L8.53716 2.23438L8.49419 2.16113C8.38342 1.99949 8.19861 1.90045 7.99998 1.90039Z"
          fill={filled ? '#FACC15' : 'none'}
          stroke={filled ? 'none' : '#FACC15'}
        />
      </g>
      <defs>
        <clipPath id="clip0_1288_12534">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default function QuickView4() {
  const [selectedColor, setSelectedColor] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [giftWrapping, setGiftWrapping] = useState(false);

  const images = [
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-04/p-lg-1.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-04/p-lg-2.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-04/p-lg-3.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-04/p-lg-4.jpg',
  ];

  const colors = [
    { bg: 'bg-[#313131]', ring: 'ring-[#313131]/30' },
    { bg: 'bg-[#DCB2AC]', ring: 'ring-[#DCB2AC]/30' },
    { bg: 'bg-[#4A7ED2]', ring: 'ring-[#4A7ED2]/30' },
    { bg: 'bg-[#555]', ring: 'ring-[#555]/30' },
    { bg: 'bg-[#738D66]', ring: 'ring-[#738D66]/30' },
  ];

  const decreaseQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  return (
    <section className="bg-background-50 py-20">
      <div className="relative mx-auto max-w-[1000px]">
        <button className="text-text-100 hover:bg-background-soft-100 absolute top-5 right-5 z-40 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg bg-transparent sm:top-0 sm:right-0 [&>svg]:size-6">
          <Xmark className="size-6" />
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center">
          {/* Image Slider */}
          <div className="w-full p-6 lg:w-7/12 lg:pr-11">
            <div className="relative h-[400px] w-full overflow-hidden rounded-xl lg:h-[590px]">
              <Swiper
                spaceBetween={10}
                navigation={{
                  prevEl: '.qv4-prev',
                  nextEl: '.qv4-next',
                }}
                modules={[Navigation]}
                className="h-full w-full"
              >
                {images.map((img, index) => (
                  <SwiperSlide key={index}>
                    <img
                      src={img}
                      className="h-full w-full rounded-xl object-cover"
                      alt={`Slider image ${index + 1}`}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* Prev Button */}
              <button className="qv4-prev hover:text-primary-500 text-title-50 bg-background-50 border-base-200 absolute top-1/2 left-5 z-20 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border sm:h-12 sm:w-12">
                <ChevronLeft className="size-6" />
              </button>

              {/* Next Button */}
              <button className="qv4-next hover:text-primary-500 text-title-50 bg-background-50 border-base-200 absolute top-1/2 right-5 z-20 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border sm:h-12 sm:w-12">
                <ChevronRight className="size-6" />
              </button>
            </div>
          </div>

          {/* Product Info */}
          <div className="lg:w-5/12">
            <div className="p-8">
              <div>
                <div className="mb-8">
                  <div>
                    <div className="flex gap-5">
                      <h3 className="text-title-50 mb-2.5 inline-block text-3xl font-semibold sm:leading-9">
                        Azure Wave Retro Shades
                      </h3>
                      <button className="text-title-50 bg-background-50 border-base-200 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border">
                        <Heart className="size-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {[...Array(4)].map((_, i) => (
                          <StarIcon key={i} filled className="size-3.5" />
                        ))}
                        <StarIcon
                          filled
                          className="size-4 [clip-path:inset(0_50%_0_0)]"
                        />
                      </div>
                      <p>4.5 (1247 reviews)</p>
                    </div>
                    <div className="my-5 flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-title-50 text-2xl font-bold">
                          $42.99
                        </span>
                        <span className="text-text-100 text-base font-normal -tracking-wide line-through">
                          $59.00
                        </span>
                      </div>
                      <span className="bg-badge-error-background text-badge-error-text inline-block rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                        35% OFF
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-9">
                  {/* Color */}
                  <div>
                    <h4 className="text-title-50 mb-4 text-base font-medium">
                      Color
                    </h4>
                    <div className="flex items-center gap-2">
                      {colors.map((color, index) => (
                        <div
                          key={index}
                          onClick={() => setSelectedColor(index)}
                          className={`relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-white transition-all duration-200 ${
                            color.bg
                          } ${selectedColor === index ? color.ring : 'ring-transparent'}`}
                        >
                          {selectedColor === index && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Check
                                className="text-white-100 size-3"
                                strokeWidth={2}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <h4 className="text-title-50 mb-4 text-base font-medium">
                      Quantity
                    </h4>
                    <div className="flex gap-4">
                      <div className="border-base-100 divide-base-100 flex h-10 w-[130px] divide-x overflow-hidden rounded-lg border">
                        <button
                          onClick={decreaseQuantity}
                          className="hover:bg-background-soft-100 text-text-50 flex h-10 w-10 items-center justify-center transition"
                        >
                          <Minus className="text-text-100 size-5" />
                        </button>
                        <div className="text-text-50 flex flex-1 items-center justify-center">
                          {quantity}
                        </div>
                        <button
                          onClick={increaseQuantity}
                          className="hover:bg-background-soft-100 text-text-50 flex h-10 w-10 items-center justify-center transition"
                        >
                          <Plus className="text-text-100 size-5" />
                        </button>
                      </div>
                      <div className="grow">
                        <button
                          onClick={() => setGiftWrapping(!giftWrapping)}
                          className={`flex h-10 w-full cursor-pointer items-center justify-center rounded-lg border px-3.5 py-2.5 text-sm leading-5 font-medium transition focus:ring-3 ${
                            giftWrapping
                              ? 'bg-primary-50 text-primary-500 border-primary-500 focus:ring-primary-500/20'
                              : 'text-title-50 bg-background-50 hover:bg-background-soft-100 border-base-100 hover:text-text-100 focus:ring-background-soft-500/20'
                          }`}
                        >
                          Add Gift Wrapping +$5
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <Button className="h-12 grow">
                      <Bolt1 className="size-5" />
                      Buy Now
                    </Button>
                    <Button appearance="outline" className="h-12 grow">
                      Add to Cart
                    </Button>
                  </div>

                  {/* Product Details Link */}
                  <div>
                    <a
                      href="javascript:void(0)"
                      className="text-title-50 flex items-center gap-2 text-base font-medium"
                    >
                      View Full Product Details
                      <ChevronRightSmall className="size-5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
