import { Button } from '@/components/core/button';
import {
  ArrowBothDirectionHorizontal2,
  Cart2,
  Eye,
  Heart,
} from '@tailgrids/icons';
import React, { useState } from 'react';

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
        return 'text-primary-700 bg-primary-50';
      case 'hot':
        return 'text-badge-error-text bg-badge-error-background';
      case 'new':
        return 'text-badge-success-text bg-badge-success-background';
      default:
        return 'text-primary-700 bg-primary-50';
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
      <div className="relative overflow-hidden">
        {product.badge && <ProductBadge badge={product.badge} />}

        <a href={product.href} className="block">
          <img
            src={product.image}
            className="w-full rounded-lg"
            alt={product.name}
          />
        </a>

        {/* Add to cart button */}
        <div className="absolute right-4 bottom-4 left-4 translate-y-6 transform opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          <Button
            appearance="outline"
            className="bg-background-50 h-11 w-full"
            onClick={() => onAddToCart(product.id)}
          >
            <Cart2 />
            Add to cart
          </Button>
        </div>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex translate-y-6 transform flex-col gap-2 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          <button
            onClick={() => onToggleWishlist(product.id)}
            className="text-title-50 bg-background-50 border-base-200 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border"
            title="Add to wishlist"
          >
            <Heart />
          </button>
          <button
            onClick={() => onQuickView(product.id)}
            className="text-title-50 bg-background-50 border-base-200 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border"
            title="Quick view"
          >
            <Eye />
          </button>
          <button
            onClick={() => onCompare(product.id)}
            className="text-title-50 bg-background-50 border-base-200 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border"
            title="Compare"
          >
            <ArrowBothDirectionHorizontal2 />
          </button>
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

export default function FeatureProducts6() {
  // Products data
  const products: Product[] = [
    {
      id: '1',
      name: 'White Jacket',
      price: 45.0,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-06/product-1.jpg',
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
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-06/product-2.jpg',
      colors: [{ name: 'Navy Blue', value: '#173A58' }],
      badge: { text: 'On Sale', type: 'sale' },
      href: '#',
    },
    {
      id: '3',
      name: 'Classic Jacket',
      price: 45.0,
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-06/product-3.jpg',
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
        ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-06/product-4.jpg',
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
        <div className="mx-auto mb-16 max-w-lg text-center">
          <h2 className="text-title-50 mb-4 text-5xl font-semibold">
            What's Trending
          </h2>
          <p className="text-text-100 text-base sm:px-10">
            These pieces are turning heads — and for good reason.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
              onQuickView={handleQuickView}
              onCompare={handleCompare}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
