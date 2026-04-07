import { Button } from '@/components/core/button';
import {
  Cart2,
  Check,
  ChevronLeft,
  ChevronRight,
  HalfStarIcon,
  Heart,
  Minus,
  Plus,
  StarIcon,
  Xmark,
} from '@tailgrids/icons';
import { useState } from 'react';
import 'swiper/css';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

export default function QuickView2() {
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState('small');
  const [quantity, setQuantity] = useState(1);

  const images = [
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-02/p-lg-1.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-02/p-lg-2.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-02/p-lg-3.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-02/p-lg-4.jpg',
  ];

  const colors = [
    { bg: 'bg-[#313131]', ring: 'ring-[#313131]/30' },
    { bg: 'bg-[#DCB2AC]', ring: 'ring-[#DCB2AC]/30' },
    { bg: 'bg-[#4A7ED2]', ring: 'ring-[#4A7ED2]/30' },
    { bg: 'bg-[#555]', ring: 'ring-[#555]/30' },
    { bg: 'bg-[#738D66]', ring: 'ring-[#738D66]/30' },
  ];

  const sizes = ['small', 'medium', 'large'];

  const decreaseQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  return (
    <section className="bg-background-50">
      <div className="relative mx-auto max-w-[1000px]">
        <button className="text-text-100 hover:bg-background-soft-100 absolute top-7 right-7 z-40 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg bg-transparent [&>svg]:size-6">
          <Xmark className="size-6" />
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center">
          {/* Image Slider */}
          <div className="p-4 lg:w-7/12 lg:p-6">
            <div>
              <div className="relative h-[477px] w-auto min-w-[476px] overflow-hidden rounded-xl sm:h-[622px]">
                <Swiper
                  spaceBetween={10}
                  navigation={{
                    prevEl: '.qv2-prev',
                    nextEl: '.qv2-next',
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
                <button className="qv2-prev hover:text-primary-500 text-title-50 bg-background-50 border-base-200 absolute top-1/2 left-5 z-20 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border">
                  <ChevronLeft className="size-6" />
                </button>

                {/* Next Button */}
                <button className="qv2-next hover:text-primary-500 text-title-50 bg-background-50 border-base-200 absolute top-1/2 right-5 z-20 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border">
                  <ChevronRight className="size-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="p-4 lg:w-5/12 lg:p-6">
            <div className="space-y-10">
              {/* Product Header */}
              <div>
                <h3 className="text-title-50 mb-2.5 text-3xl font-semibold sm:text-4xl sm:leading-10">
                  Premium Wireless Headphones
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[...Array(4)].map((_, i) => (
                      <StarIcon key={i} className="size-3.5 text-yellow-500" />
                    ))}
                    <HalfStarIcon className="size-4 text-yellow-500" />
                  </div>
                  <p className="text-text-100 text-sm">4.5 (1247 reviews)</p>
                </div>
                <div className="my-5 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-title-50 text-2xl font-bold">
                      $299.00
                    </span>
                    <span className="text-text-100 text-base font-normal -tracking-wide line-through">
                      $400.00
                    </span>
                  </div>
                  <span className="bg-badge-error-background text-badge-error-text inline-block rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                    25% OFF
                  </span>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-6">
                {/* Color */}
                <div>
                  <h4 className="text-title-50 mb-4 text-base font-medium">
                    Color:
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

                {/* Size */}
                <div>
                  <h4 className="text-title-50 mb-4 text-base font-medium">
                    Size:
                  </h4>
                  <div className="flex gap-2">
                    {sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border px-3.5 py-2 text-sm leading-5 font-medium transition ${
                          selectedSize === size
                            ? 'bg-primary-50 text-primary-500 border-primary-500'
                            : 'text-text-50 bg-background-50 hover:bg-background-soft-100 border-base-100'
                        }`}
                      >
                        {size.charAt(0).toUpperCase() + size.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <h4 className="text-title-50 mb-4 text-base font-medium">
                    Quantity:
                  </h4>
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
                </div>
              </div>

              {/* Action Buttons */}
              <div>
                <div className="flex gap-4">
                  <Button className="h-12 grow">Purchase Now</Button>
                  <Button appearance="outline" iconOnly className="h-12 w-12">
                    <Cart2 className="size-5" />
                  </Button>
                  <Button appearance="outline" iconOnly className="h-12 w-12">
                    <Heart className="size-6" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
