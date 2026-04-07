import React, { useState } from 'react';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
//@ts-ignore
import 'swiper/css';
import {
  ChevronRight,
  ChevronLeft,
  Cart2,
  Heart,
  Eye,
  ArrowBothDirectionHorizontal2,
} from '@tailgrids/icons';
import { Button } from '@/components/core/button';

// Types for our data structure
interface Color {
  name: string;
  value: string;
}

interface Badge {
  text: string;
  type: 'sale' | 'hot' | 'new' | 'primary';
}

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  colors: Color[];
  badge?: Badge;
  href: string;
}

// SectionConfig was removed as it was unused

// Icon components for better reusability

// Color selector component
interface ColorSelectorProps {
  colors: Color[];
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({
  colors,
  selectedColor,
  onColorChange,
}) => (
  <ul className="mt-4 flex items-center gap-2">
    {colors.map((color) => {
      const isWhite =
        color.value.toLowerCase() === '#ffffff' ||
        color.value.toLowerCase() === '#fff' ||
        color.value.toLowerCase() === 'white';

      return (
        <li
          key={color.value}
          onClick={() => onColorChange(color.value)}
          className={`h-3.5 w-3.5 cursor-pointer rounded-full transition-all ${
            selectedColor === color.value
              ? 'ring-foreground-soft-500 ring-1 ring-offset-1'
              : ''
          } ${isWhite ? 'border-base-200 border' : ''}`}
          style={{ backgroundColor: color.value }}
          title={color.name}
        />
      );
    })}
  </ul>
);

// Badge component
interface BadgeProps {
  badge: Badge;
}

const ProductBadge: React.FC<BadgeProps> = ({ badge }) => {
  const getBadgeStyles = (type: Badge['type']) => {
    switch (type) {
      case 'sale':
        return 'text-badge-primary-text bg-badge-primary-background';
      case 'hot':
        return 'text-badge-error-text bg-badge-error-background'; // Using error token for red
      case 'new':
        return 'text-badge-success-text bg-badge-success-background';
      default:
        return 'text-badge-primary-text bg-badge-primary-background';
    }
  };

  return (
    <span
      className={`absolute top-4 left-4 rounded-full px-3 py-1 text-sm leading-5 font-medium ${getBadgeStyles(
        badge.type,
      )}`}
    >
      {badge.text}
    </span>
  );
};

// Product card component
interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
  onToggleWishlist: (productId: string) => void;
  onQuickView: (productId: string) => void;
  onCompare: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onToggleWishlist,
  onQuickView,
  onCompare,
}) => {
  const [selectedColor, setSelectedColor] = useState(
    product.colors[0]?.value || '',
  );

  return (
    <article className="group relative cursor-pointer">
      <div className="relative">
        {product.badge && <ProductBadge badge={product.badge} />}

        <a href={product.href} className="block overflow-hidden rounded-lg">
          <img
            src={product.image}
            className="w-full transition-transform duration-300 ease-in-out group-hover:scale-110"
            alt={product.name}
          />
        </a>

        {/* Add to cart button */}
        <div className="absolute right-4 bottom-4 left-4 translate-y-6 transform opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          <Button
            appearance="outline"
            className="bg-background-50 w-full"
            onClick={() => onAddToCart(product.id)}
          >
            <Cart2 />
            Add to cart
          </Button>
        </div>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex translate-y-6 transform flex-col gap-2 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          <Button
            iconOnly
            appearance="outline"
            className="bg-background-50 text-title-50 rounded-full"
            onClick={() => onToggleWishlist(product.id)}
            title="Add to wishlist"
          >
            <Heart />
          </Button>
          <Button
            iconOnly
            appearance="outline"
            className="bg-background-50 text-title-50 rounded-full"
            onClick={() => onQuickView(product.id)}
            title="Quick view"
          >
            <Eye />
          </Button>
          <Button
            appearance="outline"
            iconOnly
            onClick={() => onCompare(product.id)}
            className="bg-background-50 text-title-50 rounded-full"
            title="Compare"
          >
            <ArrowBothDirectionHorizontal2 />
          </Button>
        </div>
      </div>

      <div className="pt-5">
        <h3 className="text-title-50 mb-1 text-base font-medium">
          <a href={product.href}>{product.name}</a>
        </h3>
        <p className="text-text-50 text-base font-normal">
          {product.originalPrice && (
            <span className="text-text-100 mr-2 line-through">
              ${product.originalPrice.toFixed(2)}
            </span>
          )}
          ${product.price.toFixed(2)}
        </p>

        {product.colors.length > 0 && (
          <ColorSelector
            colors={product.colors}
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
          />
        )}
      </div>
    </article>
  );
};

export default function ProductCarousels3() {
  // Products data
  const products: Product[] = [
    {
      id: '1',
      name: 'White Jacket',
      price: 45.0,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-03/product-1.jpg',
      colors: [
        { name: 'Light Gray', value: '#E5E7EB' },
        { name: 'Brown', value: '#A19487' },
      ],
      href: '#',
    },
    {
      id: '2',
      name: 'Blue Jacket',
      price: 45.0,
      originalPrice: 89.0,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-03/product-2.jpg',
      colors: [{ name: 'Navy Blue', value: '#173A58' }],
      badge: { text: 'On Sale', type: 'sale' },
      href: '#',
    },
    {
      id: '3',
      name: 'Classic Jacket',
      price: 45.0,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-03/product-3.jpg',
      colors: [
        { name: 'White', value: '#ffffff' },
        { name: 'Black', value: '#010A09' },
      ],
      badge: { text: 'Hot Item', type: 'hot' },
      href: '#',
    },
    {
      id: '4',
      name: 'Premium Jacket',
      price: 45.0,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-03/product-4.jpg',
      colors: [
        { name: 'Light Gray', value: '#E5E7EB' },
        { name: 'Brown', value: '#A19487' },
      ],
      href: '#',
    },
    {
      id: '5',
      name: 'Premium Jacket',
      price: 45.0,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-carousels/product-carousel-03/product-1.jpg',
      colors: [
        { name: 'Light Gray', value: '#E5E7EB' },
        { name: 'Brown', value: '#A19487' },
      ],
      href: '#',
    },
  ];

  // Event handlers
  const handleAddToCart = (productId: string) => {
    console.log('Adding to cart:', productId);
    // Implement add to cart logic
  };

  const handleToggleWishlist = (productId: string) => {
    console.log('Toggling wishlist:', productId);
    // Implement wishlist toggle logic
  };

  const handleQuickView = (productId: string) => {
    console.log('Quick view:', productId);
    // Implement quick view logic
  };

  const handleCompare = (productId: string) => {
    console.log('Compare:', productId);
    // Implement compare logic
  };

  return (
    <section className="bg-background-50 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-8 max-w-lg text-center lg:mb-16">
          <h2 className="text-title-50 mb-4 text-5xl font-semibold">
            Just For You
          </h2>
          <p className="text-text-100 text-base sm:px-10">
            These pieces are turning heads — and for good reason.
          </p>
        </div>

        <div className="relative">
          <Swiper
            className="pb-10"
            modules={[Navigation]}
            navigation={{
              prevEl: '.swiper-button-prev',
              nextEl: '.swiper-button-next',
            }}
            pagination={{
              el: '.swiper-pagination',
              clickable: true,
              bulletClass:
                'w-7 h-1.5 rounded-full transition-colors duration-300 cursor-pointer bg-background-soft-300 hover:bg-primary-500',
              bulletActiveClass: 'bg-primary-500',
            }}
            spaceBetween={28}
            slidesPerView={1}
            breakpoints={{
              640: { slidesPerView: 2, spaceBetween: 24 },
              1024: { slidesPerView: 3, spaceBetween: 28 },
              1200: { slidesPerView: 4, spaceBetween: 28 },
            }}
          >
            {products.map((product) => (
              <SwiperSlide className="mb-5">
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  onQuickView={handleQuickView}
                  onCompare={handleCompare}
                />
              </SwiperSlide>
            ))}
          </Swiper>
          <button className="swiper-button-prev border-base-200 text-title-50 bg-background-50 hover:bg-background-soft-100 [&.swiper-button-disabled]:hover:bg-background-50 absolute top-1/2 -left-5 z-20 inline-flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border transition-colors [&.swiper-button-disabled]:cursor-not-allowed [&.swiper-button-disabled]:opacity-50">
            <ChevronLeft />
          </button>
          <button className="swiper-button-next border-base-200 text-title-50 bg-background-50 hover:bg-background-soft-100 [&.swiper-button-disabled]:hover:bg-background-50 absolute top-1/2 -right-5 z-20 inline-flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border transition-colors [&.swiper-button-disabled]:cursor-not-allowed [&.swiper-button-disabled]:opacity-50">
            <ChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
}
