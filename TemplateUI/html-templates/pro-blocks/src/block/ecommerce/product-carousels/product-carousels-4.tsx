import { Button } from '@/components/core/button';
import { Cart2, ChevronLeft, ChevronRight, Heart } from '@tailgrids/icons';
import 'swiper/css';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string;
  isNew?: boolean;
}

const products: Product[] = [
  {
    id: 1,
    name: 'Beige Lounge Chair',
    description: 'Plush cushioning for ultimate comfort',
    price: '$249.00',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-04/product-1.jpg',
  },
  {
    id: 2,
    name: 'Azure Bistro Chairs (Set)',
    description: 'Vibrant style for any space',
    price: '$1.5k+',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-04/product-2.jpg',
    isNew: true,
  },
  {
    id: 3,
    name: 'Vintage-Style Armchair',
    description: 'Soft breathable fabric',
    price: '$259.00',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-04/product-3.jpg',
  },
  {
    id: 4,
    name: 'Beige Lounge Chair',
    description: 'Plush cushioning for ultimate comfort',
    price: '$249.00',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-04/product-1.jpg',
  },
];

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  return (
    <article className="group bg-background-50 rounded-2xl p-3">
      <div className="relative overflow-hidden">
        {product.isNew && (
          <span className="text-badge-success-text bg-badge-success-background absolute top-4 left-4 z-20 rounded-full px-3 py-1 text-sm font-medium">
            New Added
          </span>
        )}
        <button
          className="bg-background-50 absolute top-4 right-4 z-20 inline-flex h-11 w-11 translate-y-6 transform items-center justify-center rounded-full opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100"
          aria-label="Add to favorites"
        >
          <Heart className="text-title-50 size-5" />
        </button>
        <a
          href="javascript:void(0)"
          className="block overflow-hidden rounded-lg"
        >
          <img
            src={product.image}
            className="w-full transition-transform duration-300 ease-in-out group-hover:scale-110"
            alt={product.name}
          />
        </a>
      </div>
      <div className="mt-5 p-3">
        <div className="mb-5 flex items-start">
          <div className="grow">
            <h3 className="text-title-50 mb-1 text-base font-semibold">
              <a href="javascript:void(0)">{product.name}</a>
            </h3>
            <p className="text-text-100 text-sm leading-5">
              {product.description}
            </p>
          </div>
          <div>
            <span className="text-title-50 text-base font-medium">
              {product.price}
            </span>
          </div>
        </div>
        <Button
          aria-label="Add to cart"
          appearance="outline"
          className="w-full"
        >
          <Cart2 className="size-6" />
          Add to cart
        </Button>
      </div>
    </article>
  );
};

export default function ProductCarousels4() {
  return (
    <section className="bg-background-soft-100 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
            Modern Comfort Essentials
          </h2>
          <p className="text-text-100 text-base lg:px-24">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <Swiper
          modules={[Navigation]}
          spaceBetween={28}
          breakpoints={{
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
            1200: { slidesPerView: 3 },
          }}
          navigation={{
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          }}
          className="mySwiper"
        >
          {products.map((product) => (
            <SwiperSlide key={product.id}>
              <ProductCard product={product} />
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="mt-12 flex justify-center gap-3.5">
          <button
            className="swiper-button-prev text-title-50 bg-background-50 hover:bg-background-soft-100 border-base-200 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft />
          </button>
          <button
            className="swiper-button-next text-title-50 bg-background-50 hover:bg-background-soft-100 border-base-200 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
}
