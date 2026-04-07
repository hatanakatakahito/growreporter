import { Button } from '@/components/core/button';
import {
  Cart2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  ShareNodes,
  Xmark,
} from '@tailgrids/icons';
import { useState } from 'react';
import 'swiper/css';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

export default function QuickView3() {
  const [selectedLens, setSelectedLens] = useState('50');
  const [selectedCondition, setSelectedCondition] = useState('good');
  const [quantity, setQuantity] = useState(1);

  const images = [
    ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-03/p-lg-1.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-03/p-lg-2.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-03/p-lg-3.jpg',
    'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-details/details-03/p-lg-4.jpg',
  ];

  const lensOptions = [
    { id: '50', label: '50mm f/1.4 Standard', price: 0 },
    { id: '35', label: '35mm f/2.8 Wide (+$320)', price: 320 },
    { id: '90', label: '90mm f/2.8 Tele (+$380)', price: 380 },
  ];

  const conditions = [
    { id: 'good', label: 'Good', price: 0 },
    { id: 'excellent', label: 'Excellent', price: 0 },
    { id: 'mint', label: 'Mint (+$380)', price: 380 },
  ];

  const decreaseQuantity = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  return (
    <section className="bg-background-50">
      <div className="relative mx-auto max-w-[1000px]">
        <button className="text-text-100 hover:bg-background-soft-100 absolute top-5 right-5 z-40 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg bg-transparent sm:top-0 sm:right-0 [&>svg]:size-6">
          <Xmark className="size-6" />
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center">
          {/* Image Slider */}
          <div className="w-full lg:w-7/12 lg:pr-11">
            <div className="relative h-[400px] w-full overflow-hidden sm:h-[500px] md:h-[600px] lg:h-[752px]">
              <Swiper
                spaceBetween={10}
                navigation={{
                  prevEl: '.qv3-prev',
                  nextEl: '.qv3-next',
                }}
                modules={[Navigation]}
                className="h-full w-full"
              >
                {images.map((img, index) => (
                  <SwiperSlide key={index}>
                    <img
                      src={img}
                      className="h-full w-full object-cover"
                      alt={`Slider image ${index + 1}`}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* Prev Button */}
              <button className="qv3-prev hover:text-primary-500 text-title-50 bg-background-50 border-base-200 absolute top-1/2 left-5 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border sm:h-12 sm:w-12">
                <ChevronLeft className="size-6" />
              </button>

              {/* Next Button */}
              <button className="qv3-next hover:text-primary-500 text-title-50 bg-background-50 border-base-200 absolute top-1/2 right-5 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border sm:h-12 sm:w-12">
                <ChevronRight className="size-6" />
              </button>
            </div>
          </div>

          {/* Product Info */}
          <div className="lg:w-5/12">
            <div className="px-4 py-8 lg:py-0">
              <div>
                <div className="mb-8">
                  <div className="flex items-start">
                    <h3 className="text-title-50 mb-2 text-3xl leading-9 font-semibold">
                      Vintage Camera M3 (1954)
                    </h3>
                    <button className="text-title-50 bg-background-50 border-base-200 z-20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border sm:h-12 sm:w-12">
                      <Heart className="size-5" />
                    </button>
                  </div>
                  <p className="text-text-100 mb-5 text-base leading-6">
                    Fully Refurbished with 50mm f/1.4 Lens
                  </p>
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-title-50 text-2xl font-bold">
                        $1299.99
                      </span>
                      <span className="text-text-100 text-base font-normal -tracking-wide line-through">
                        $1547.00
                      </span>
                    </div>
                    <span className="bg-badge-error-background text-badge-error-text inline-block rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                      20% OFF
                    </span>
                  </div>
                  <span className="text-badge-success-text bg-badge-success-background inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium">
                    <span className="bg-badge-success-background0 h-1.5 w-1.5 rounded-full"></span>
                    Only 2 left in stock
                  </span>
                </div>

                <div className="space-y-6">
                  {/* Lens Option */}
                  <div>
                    <h4 className="text-title-50 mb-4 text-base font-medium">
                      Lens Option
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {lensOptions.map((lens) => (
                        <button
                          key={lens.id}
                          onClick={() => setSelectedLens(lens.id)}
                          className={`inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border px-3.5 py-2 text-sm leading-5 font-medium transition ${
                            selectedLens === lens.id
                              ? 'bg-primary-50 text-primary-500 border-primary-500'
                              : 'text-text-50 bg-background-50 hover:bg-background-soft-100 border-base-100'
                          }`}
                        >
                          {lens.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conditions */}
                  <div>
                    <h4 className="text-title-50 mb-4 text-base font-medium">
                      Conditions
                    </h4>
                    <div className="flex gap-2">
                      {conditions.map((condition) => (
                        <button
                          key={condition.id}
                          onClick={() => setSelectedCondition(condition.id)}
                          className={`inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border px-3.5 py-2 text-sm leading-5 font-medium transition ${
                            selectedCondition === condition.id
                              ? 'bg-primary-50 text-primary-500 border-primary-500'
                              : 'text-text-50 bg-background-50 hover:bg-background-soft-100 border-base-100'
                          }`}
                        >
                          {condition.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <h4 className="text-title-50 mb-4 text-base font-medium">
                      Quantity
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
                <div className="mt-12 flex gap-4">
                  <Button className="h-12 grow">Purchase Now</Button>
                  <Button appearance="outline" iconOnly className="h-12 w-12">
                    <Cart2 className="size-5" />
                  </Button>
                  <Button appearance="outline" iconOnly className="h-12 w-12">
                    <ShareNodes className="size-5" />
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
