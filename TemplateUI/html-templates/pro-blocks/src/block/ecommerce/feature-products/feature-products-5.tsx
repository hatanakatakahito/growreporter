import { Button } from '@/components/core/button';
import { Cart2, Heart } from '@tailgrids/icons';
import React, { useState } from 'react';

// Types and interfaces
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  imageAlt: string;
  href: string;
  badge?: {
    text: string;
    variant: 'hot' | 'sale' | 'new' | 'featured';
  };
}

interface SectionProps {
  title?: string;
  subtitle?: string;
  products?: Product[];
  className?: string;
}

// Badge Component
const ProductBadge: React.FC<{
  text: string;
  variant: 'hot' | 'sale' | 'new' | 'featured';
}> = ({ text, variant }) => {
  const variantClasses = {
    hot: 'text-badge-error-text bg-badge-error-background',
    sale: 'text-badge-success-text bg-badge-success-background',
    new: 'text-blue-700 bg-blue-50',
    featured: 'text-purple-700 bg-purple-50',
  };

  return (
    <span
      className={`absolute top-4 left-4 rounded-full px-3 py-1 text-sm leading-5 font-medium ${variantClasses[variant]}`}
    >
      {text}
    </span>
  );
};

// Favorite Button Component
const FavoriteButton: React.FC<{
  productId: string;
  isFavorite: boolean;
  onToggle: (productId: string) => void;
  productName: string;
}> = ({ productId, isFavorite, onToggle, productName }) => (
  <button
    className="bg-background-50 ring-background-soft-500 absolute top-4 right-4 inline-flex h-10 w-10 translate-y-6 transform items-center justify-center rounded-full opacity-0 ring-1 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100 hover:scale-110"
    onClick={() => onToggle(productId)}
    aria-label={`${
      isFavorite ? 'Remove' : 'Add'
    } ${productName} from favorites`}
  >
    <Heart className={isFavorite ? 'text-red-500' : 'text-text-50'} />
  </button>
);

// Add to Cart Button Component
const AddToCartButton: React.FC<{
  productId: string;
  productName: string;
  onAddToCart: (productId: string) => void;
}> = ({ productId, productName, onAddToCart }) => (
  <Button
    className="hover:bg-primary-500 hover:text-white-100 w-full"
    appearance="outline"
    onClick={() => onAddToCart(productId)}
    aria-label={`Add ${productName} to cart`}
  >
    <Cart2 />
    Add to cart
  </Button>
);

// Product Card Component
const ProductCard: React.FC<{
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  onAddToCart: (productId: string) => void;
}> = ({ product, isFavorite, onToggleFavorite, onAddToCart }) => {
  return (
    <article className="relative">
      <a href={product.href} className="group relative block">
        <img
          src={product.imageUrl}
          className="w-full rounded-lg object-cover"
          alt={product.imageAlt}
        />
        <FavoriteButton
          productId={product.id}
          isFavorite={isFavorite}
          onToggle={onToggleFavorite}
          productName={product.name}
        />
        {product.badge && (
          <ProductBadge
            text={product.badge.text}
            variant={product.badge.variant}
          />
        )}
      </a>
      <div className="mb-5 flex items-start pt-4">
        <div className="grow">
          <h3 className="text-title-50 text-base font-medium">
            <a href={product.href}>{product.name}</a>
          </h3>
          <p className="text-text-100 text-sm">{product.description}</p>
        </div>
        <div>
          <span className="text-text-50 cursor-pointer font-medium">
            ${product.price.toFixed(2)}
          </span>
        </div>
      </div>
      <AddToCartButton
        productId={product.id}
        productName={product.name}
        onAddToCart={onAddToCart}
      />
    </article>
  );
};

// Default products data
const defaultProducts: Product[] = [
  {
    id: '1',
    name: 'White Jacket',
    description: 'Lightweight & water-resistant',
    price: 249.0,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-05/product-1.jpg',
    imageAlt: 'White Jacket',
    href: '#',
    badge: {
      text: 'Hot Item',
      variant: 'hot',
    },
  },
  {
    id: '2',
    name: 'Tote Bag',
    description: 'Spacious & stylish',
    price: 209.0,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-05/product-2.jpg',
    imageAlt: 'Tote Bag',
    href: '#',
  },
  {
    id: '3',
    name: 'Beige Cap',
    description: 'Soft breathable fabric',
    price: 249.0,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-05/product-3.jpg',
    imageAlt: 'Beige Cap',
    href: '#',
  },
  {
    id: '4',
    name: 'Qua Watch',
    description: 'Modern rubber sole',
    price: 249.0,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-05/product-4.jpg',
    imageAlt: 'Qua Watch',
    href: '#',
  },
];

export default function FeatureProducts5({
  title = 'Handpicked Highlights',
  subtitle = 'There are many variations of available but the majority have suffered alteration in some form.',
  products = defaultProducts,
  className = '',
}: SectionProps) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

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

  const handleAddToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    console.log('Adding to cart:', { productId, product: product?.name });
    // Implement cart logic here
  };

  return (
    <section className={`bg-background-50 py-16 sm:py-28 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-lg text-center">
          <h2 className="text-title-50 mb-4 text-5xl font-semibold">{title}</h2>
          <p className="text-text-100 text-base sm:px-10">{subtitle}</p>
        </div>
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isFavorite={favorites.has(product.id)}
              onToggleFavorite={handleToggleFavorite}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
