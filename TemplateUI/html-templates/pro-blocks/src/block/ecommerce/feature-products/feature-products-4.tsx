import { Button } from '@/components/core/button';
import { Cart2, Heart } from '@tailgrids/icons';
import React, { useState } from 'react';

// Types and interfaces
interface ColorOption {
  id: string;
  name: string;
  value: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  features: string[];
  price: number;
  originalPrice?: number;
  imageUrl: string;
  imageAlt: string;
  href: string;
  colors?: ColorOption[];
}

interface SectionProps {
  title?: string;
  subtitle?: string;
  product?: Product;
  className?: string;
}

// Color Selector Component
const ColorSelector: React.FC<{
  colors: ColorOption[];
  selectedColor: string;
  onColorChange: (colorId: string) => void;
}> = ({ colors, selectedColor, onColorChange }) => {
  return (
    <div className="flex items-center gap-3 py-5 sm:py-12">
      <span className="text-text-100 text-base">Color:</span>
      <ul className="flex gap-2">
        {colors.map((color) => (
          <li
            key={color.id}
            onClick={() => onColorChange(color.id)}
            className={`h-5 w-5 cursor-pointer rounded-full transition-all hover:scale-110 ${
              selectedColor === color.id
                ? 'ring-foreground-soft-500 ring-1 ring-offset-1'
                : ''
            }`}
            style={{ backgroundColor: color.value }}
            title={color.name}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onColorChange(color.id);
              }
            }}
            aria-label={`Select ${color.name} color`}
          />
        ))}
      </ul>
    </div>
  );
};

// Action Button Component
const ActionButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
}> = ({ icon, onClick, ariaLabel, className = '' }) => (
  <button
    className={`text-title-50 border-base-200 hover:bg-background-soft-50 flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border p-3 transition-colors ${className}`}
    onClick={onClick}
    aria-label={ariaLabel}
  >
    {icon}
  </button>
);

// Add to Cart Button Component
const AddToCartButton: React.FC<{
  onClick: () => void;
  productName: string;
}> = ({ onClick, productName }) => (
  <Button
    className="h-12"
    appearance="outline"
    onClick={onClick}
    aria-label={`Add ${productName} to cart`}
  >
    <Cart2 className="size-5" />
    Add to cart
  </Button>
);

// Product Features List Component
const ProductFeaturesList: React.FC<{ features: string[] }> = ({
  features,
}) => (
  <ul className="list-inside list-disc space-y-2">
    {features.map((feature, index) => (
      <li key={index} className="text-text-100 text-base">
        {feature}
      </li>
    ))}
  </ul>
);

// Price Display Component
const PriceDisplay: React.FC<{
  price: number;
  originalPrice?: number;
  startingText?: string;
}> = ({ price, originalPrice, startingText = '' }) => (
  <div>
    {originalPrice && (
      <span className="text-text-100 line-through">
        ${originalPrice.toFixed(2)}
      </span>
    )}
    <h3 className="text-title-50 text-xl font-semibold">
      {startingText}${price.toFixed(2)}
    </h3>
  </div>
);

// Default product data
const defaultProduct: Product = {
  id: '1',
  name: 'Leisara Blush Handbag',
  description: 'Premium vegan leather finish with sleek design',
  features: ['Premium vegan leather finish', 'Sleek metal clasp & soft handle'],
  price: 199.0,
  originalPrice: 339.0,
  imageUrl:
    ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/featured-products/featured-products-04/product-1.jpg',
  imageAlt: 'Leisara Blush Handbag',
  href: '#',
  colors: [
    { id: 'blush', name: 'Blush', value: '#DCB2AC' },
    { id: 'blue', name: 'Blue', value: '#4A7ED2' },
    { id: 'purple', name: 'Purple', value: '#8D6682' },
  ],
};

export default function FeatureProducts4({
  title = 'Your New Favorites',
  subtitle = 'There are many variations of available but the majority have suffered alteration in some form.',
  product = defaultProduct,
  className = '',
}: SectionProps) {
  const [selectedColor, setSelectedColor] = useState<string>(
    product.colors?.[0]?.id || '',
  );

  const handleAddToCart = () => {
    console.log('Adding to cart:', {
      productId: product.id,
      selectedColor,
      product: product.name,
    });
    // Implement cart logic here
  };

  const handleToggleFavorite = () => {
    console.log('Toggle favorite:', product.id);
    // Implement favorite logic here
  };

  const handleColorChange = (colorId: string) => {
    setSelectedColor(colorId);
  };

  return (
    <section className={`bg-background-soft-100 py-16 sm:py-28 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-lg text-center">
          <h2 className="text-title-50 mb-4 text-5xl font-semibold">{title}</h2>
          <p className="text-text-100 text-base sm:px-10">{subtitle}</p>
        </div>
        <div className="bg-background-50 grid rounded-xl p-3 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex h-full items-stretch">
              <img
                src={product.imageUrl}
                className="h-full w-full rounded-lg object-cover"
                alt={product.imageAlt}
              />
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="px-5 py-5 lg:px-12">
              <h3 className="text-title-50 mb-5 text-2xl font-medium sm:text-3xl">
                <a href={product.href}>{product.name}</a>
              </h3>
              <ProductFeaturesList features={product.features} />
              {product.colors && product.colors.length > 0 && (
                <ColorSelector
                  colors={product.colors}
                  selectedColor={selectedColor}
                  onColorChange={handleColorChange}
                />
              )}
              <div className="flex flex-col justify-between gap-5 sm:flex-row">
                <PriceDisplay
                  price={product.price}
                  originalPrice={product.originalPrice}
                  startingText="Start from "
                />
                <div className="flex gap-3">
                  <ActionButton
                    icon={<Heart className="size-5" />}
                    onClick={handleToggleFavorite}
                    ariaLabel={`Add ${product.name} to favorites`}
                  />
                  <AddToCartButton
                    onClick={handleAddToCart}
                    productName={product.name}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
