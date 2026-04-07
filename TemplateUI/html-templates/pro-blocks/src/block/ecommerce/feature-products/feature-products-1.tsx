import { Cart2, Eye, Heart } from '@tailgrids/icons';
import React, { useState } from 'react';

// Types and interfaces
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  imageAlt: string;
  badge?: {
    text: string;
    variant: 'sale' | 'new' | 'hot';
  };
  href: string;
}

interface SectionProps {
  title?: string;
  subtitle?: string;
  products?: Product[];
  className?: string;
}

// Product Badge Component
const ProductBadge: React.FC<{ badge: Product['badge'] }> = ({ badge }) => {
  if (!badge) return null;

  const badgeClasses = {
    sale: 'text-badge-error-text bg-badge-error-background',
    new: 'text-badge-success-text bg-badge-success-background',
    hot: 'text-orange-700 bg-orange-50',
  };

  return (
    <span
      className={`absolute top-4 left-4 rounded-full px-3 py-1 text-sm leading-5 font-medium ${
        badgeClasses[badge.variant]
      }`}
    >
      {badge.text}
    </span>
  );
};

// Action Button Component
const ActionButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}> = ({ icon, onClick, ariaLabel }) => (
  <button
    className="text-title-50 bg-background-50 border-base-200 hover:bg-background-soft-50 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border transition-colors"
    onClick={onClick}
    aria-label={ariaLabel}
  >
    {icon}
  </button>
);

// Product Card Component
const ProductCard: React.FC<{
  product: Product;
  onAddToCart: (productId: string) => void;
  onToggleFavorite: (productId: string) => void;
  onQuickView: (productId: string) => void;
}> = ({ product, onAddToCart, onToggleFavorite, onQuickView }) => {
  return (
    <article className="group relative cursor-pointer overflow-hidden">
      <div className="relative overflow-hidden">
        <ProductBadge badge={product.badge} />
        <a href={product.href} className="block">
          <img
            src={product.imageUrl}
            className="w-full rounded-lg"
            alt={product.imageAlt}
          />
        </a>
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 translate-y-6 transform gap-2 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          <ActionButton
            icon={<Cart2 />}
            onClick={() => onAddToCart(product.id)}
            ariaLabel={`Add ${product.name} to cart`}
          />
          <ActionButton
            icon={<Heart />}
            onClick={() => onToggleFavorite(product.id)}
            ariaLabel={`Add ${product.name} to favorites`}
          />
          <ActionButton
            icon={<Eye />}
            onClick={() => onQuickView(product.id)}
            ariaLabel={`Quick view ${product.name}`}
          />
        </div>
      </div>
      <div className="pt-4">
        <h3 className="text-title-50 mb-1 text-base font-semibold">
          <a href={product.href}>{product.name}</a>
        </h3>
        <p className="text-text-100 mb-4 text-xs">{product.description}</p>
        <div className="flex items-center gap-2">
          {product.originalPrice && (
            <span className="text-text-100 text-sm line-through">
              ${product.originalPrice.toFixed(2)}
            </span>
          )}
          <p className="text-title-50 text-base font-medium">
            ${product.price.toFixed(2)}
          </p>
        </div>
      </div>
    </article>
  );
};

// Default products data
const defaultProducts: Product[] = [
  {
    id: '1',
    name: 'LuxeTail Blazer Set',
    description: 'Power dressing made effortless.',
    price: 249.0,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-01/product-1.jpg',
    imageAlt: 'LuxeTail Blazer Set',
    badge: { text: 'Sale!', variant: 'sale' },
    href: '#',
  },
  {
    id: '2',
    name: 'Ivory Edge Suit',
    description: 'Timeless tailoring with modern edge.',
    price: 339.0,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-01/product-2.jpg',
    imageAlt: 'Ivory Edge Suit',
    href: '#',
  },
  {
    id: '3',
    name: 'NoirFlow Oversized Blazer',
    description: 'Sophisticated contrast statements.',
    price: 499.0,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-01/product-3.jpg',
    imageAlt: 'NoirFlow Oversized Blazer',
    badge: { text: 'New', variant: 'new' },
    href: '#',
  },
  {
    id: '4',
    name: 'Studio Ease Shirt & Flare',
    description: 'Relaxed elegance for everyday shine.',
    price: 545.0,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-01/product-4.jpg',
    imageAlt: 'Studio Ease Shirt & Flare',
    href: '#',
  },
];

export default function FeatureProducts1({
  title = 'Featured Looks',
  subtitle = 'There are many variations of available but the majority have suffered alteration in some form.',
  products = defaultProducts,
  className = '',
}: SectionProps) {
  const [, setFavorites] = useState<Set<string>>(new Set());

  const handleAddToCart = (productId: string) => {
    console.log('Adding to cart:', productId);
    // Implement cart logic here
  };

  const handleToggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId);
      } else {
        newFavorites.add(productId);
      }
      return newFavorites;
    });
  };

  const handleQuickView = (productId: string) => {
    console.log('Quick view:', productId);
    // Implement quick view logic here
  };

  return (
    <section className={`bg-background-50 py-16 sm:py-28 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-md text-center">
          <h2 className="text-title-50 mb-4 text-5xl font-semibold">{title}</h2>
          <p className="text-text-100 text-base">{subtitle}</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              onToggleFavorite={handleToggleFavorite}
              onQuickView={handleQuickView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
