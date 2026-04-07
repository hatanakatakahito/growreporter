import {
  Cart2,
  ChevronLeft,
  ChevronRight,
  Eye,
  HalfStarIcon,
  Heart,
  StarIcon,
} from '@tailgrids/icons';
import 'swiper/css';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
  badge?: string;
  badgeColor: 'red' | 'green';
  rating: number;
}

const products: Product[] = [
  {
    id: 1,
    name: 'Blush Runner Sneakers',
    price: '$79.00',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-05/product-1.jpg',
    badge: '-20%',
    badgeColor: 'red',
    rating: 4.5,
  },
  {
    id: 2,
    name: 'Luxe Gold Wristwatch',
    price: '$120.00',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-05/product-2.jpg',
    badge: 'New Arrivals',
    badgeColor: 'green',
    rating: 4,
  },
  {
    id: 3,
    name: 'Urban Explorer Backpack',
    price: '$99.00',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-05/product-3.jpg',
    badge: undefined,
    badgeColor: 'red',
    rating: 5,
  },
  {
    id: 4,
    name: 'ProShot DSLR Camera',
    price: '$499.00',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-05/product-4.jpg',
    badge: undefined,
    badgeColor: 'red',
    rating: 4.5,
  },
  {
    id: 5,
    name: 'Blush Runner Sneakers',
    price: '$79.00',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-05/product-1.jpg',
    badge: '-20%',
    badgeColor: 'red',
    rating: 4.5,
  },
];

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <StarIcon key={i} className="size-3.5 text-yellow-400" />
      ))}
      {hasHalfStar && <HalfStarIcon className="size-3.5 text-yellow-400" />}
    </div>
  );
};

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  return (
    <article className="overflow-hidden">
      <a href="javascript:void(0)" className="group relative block rounded-xl">
        {product.badge && (
          <span
            className={`absolute top-4 left-4 z-20 rounded-full px-2.5 py-0.5 text-sm font-medium ${
              product.badgeColor === 'red'
                ? 'bg-badge-error-background text-badge-error-text'
                : 'bg-badge-success-background text-badge-success-text'
            }`}
          >
            {product.badge}
          </span>
        )}
        <img
          src={product.image}
          className="block w-full rounded-xl"
          alt={product.name}
        />
        <div className="border-base-100 bg-background-50 absolute right-2 bottom-2 left-2 flex h-12 translate-y-6 transform justify-between overflow-hidden rounded-lg border opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          <button
            className="border-base-100 hover:bg-background-soft-50 text-title-50 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-l-lg border-r p-3"
            aria-label="Add to favorites"
          >
            <Heart />
          </button>
          <button
            className="hover:bg-background-soft-50 text-title-50 flex flex-1 cursor-pointer items-center justify-center gap-3 p-3"
            aria-label="Add to cart"
          >
            <Cart2 />
            Add to cart
          </button>
          <button
            className="border-base-100 hover:bg-background-soft-50 text-title-50 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-r-lg border-l p-3"
            aria-label="View product"
          >
            <Eye />
          </button>
        </div>
      </a>
      <div className="mt-5">
        <div className="flex items-center justify-between gap-5">
          <h3 className="text-text-100 mb-3 text-base font-medium">
            <a href="javascript:void(0)">{product.name}</a>
          </h3>
          <p className="text-text-50 text-base font-medium">{product.price}</p>
        </div>
        <StarRating rating={product.rating} />
      </div>
    </article>
  );
};

export default function ProductCarousels5() {
  return (
    <section className="bg-background-50 py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-8 flex items-end justify-between lg:mb-16">
          <div className="max-w-lg text-left">
            <h2 className="text-title-50 mb-4 text-left text-4xl font-semibold sm:text-5xl">
              Explore our hottest
            </h2>
            <p className="text-text-100 text-base lg:pr-10">
              There are many variations of available but the majority have
              suffered alteration in some form.
            </p>
          </div>
          <div className="hidden lg:block">
            <div className="flex gap-3.5">
              <button
                className="swiper-button-prev text-title-50 bg-background-50 hover:bg-primary-500 hover:text-white-100 border-base-200 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft />
              </button>
              <button
                className="swiper-button-next text-title-50 bg-background-50 hover:bg-primary-500 hover:text-white-100 border-base-200 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        </div>
        <Swiper
          modules={[Navigation]}
          spaceBetween={24}
          breakpoints={{
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
            1200: { slidesPerView: 4 },
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
        <div className="mt-8 flex justify-center gap-3.5 lg:hidden">
          <button
            className="swiper-button-prev hover:bg-primary-500 border-base-200 bg-background-50 hover:text-white-100 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft />
          </button>
          <button
            className="swiper-button-next hover:bg-primary-500 border-base-200 bg-background-50 hover:text-white-100 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
}
