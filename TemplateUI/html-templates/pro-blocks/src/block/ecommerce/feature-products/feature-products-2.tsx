import { Heart } from '@tailgrids/icons';
import React, { useState } from 'react';

// Types and interfaces
interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  imageAlt: string;
  href: string;
  isFavorite?: boolean;
}

interface SectionProps {
  title?: string;
  subtitle?: string;
  products?: Product[];
  className?: string;
}

// Heart Icon Component with filled state
const HeartIcon: React.FC<{
  className?: string;
  filled?: boolean;
  onClick?: () => void;
}> = ({ filled = false, onClick }) => (
  <button
    className="text-text-50 cursor-pointer transition-colors"
    onClick={onClick}
    aria-label={filled ? 'Remove from favorites' : 'Add to favorites'}
  >
    <Heart className="size-6" fill={filled ? 'currentColor' : 'none'} />
  </button>
);

// Product Card Component
const ProductCard: React.FC<{
  product: Product;
  onToggleFavorite: (productId: string) => void;
  isFavorite: boolean;
}> = ({ product, onToggleFavorite, isFavorite }) => {
  return (
    <article className="group relative cursor-pointer overflow-hidden">
      <div className="relative overflow-hidden">
        <a href={product.href} className="block">
          <img
            src={product.imageUrl}
            className="w-full rounded-lg"
            alt={product.imageAlt}
          />
        </a>
      </div>
      <div className="pt-5">
        <div className="flex items-start">
          <div className="grow">
            <span className="text-text-100 text-sm leading-5">
              {product.category}
            </span>
            <h3 className="text-title-50 mb-3 text-2xl font-medium">
              <a href={product.href}>{product.name}</a>
            </h3>
            <div className="flex items-center gap-2">
              {product.originalPrice && (
                <span className="text-text-100 line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
              <span className="text-title-50 text-base font-medium">
                ${product.price.toFixed(2)}
              </span>
            </div>
          </div>
          <div>
            <HeartIcon
              filled={isFavorite}
              onClick={() => onToggleFavorite(product.id)}
            />
          </div>
        </div>
      </div>
    </article>
  );
};

// Default products data
const defaultProducts: Product[] = [
  {
    id: '1',
    name: 'Apple Watch Series 10',
    category: 'Watches',
    price: 123.0,
    originalPrice: 400.0,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-02/product-1.jpg',
    imageAlt: 'Apple Watch Series 10',
    href: '#',
  },
  {
    id: '2',
    name: 'Nike leather shoe',
    category: 'Shoes',
    price: 339.0,
    originalPrice: 199.0,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-02/product-2.jpg',
    imageAlt: 'Nike leather shoe',
    href: '#',
    isFavorite: true,
  },
  {
    id: '3',
    name: 'Blook Denim Pants',
    category: 'Denim',
    price: 300.0,
    originalPrice: 99.0,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-02/product-3.jpg',
    imageAlt: 'Blook Denim Pants',
    href: '#',
  },
];

export default function FeatureProducts2({
  title = 'Top Picks of the Week',
  subtitle = 'There are many variations of available but the majority have suffered alteration in some form.',
  products = defaultProducts,
  className = '',
}: SectionProps) {
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(products.filter((p) => p.isFavorite).map((p) => p.id)),
  );

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

  return (
    <section className={`bg-background-50 py-16 sm:py-28 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-lg text-center">
          <h2 className="text-title-50 mb-4 text-5xl font-semibold">{title}</h2>
          <p className="text-text-100 text-base sm:px-10">{subtitle}</p>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onToggleFavorite={handleToggleFavorite}
              isFavorite={favorites.has(product.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
