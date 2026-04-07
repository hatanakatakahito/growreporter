import { Button } from '@/components/core/button';
import { Heart } from '@tailgrids/icons';
import { useState } from 'react';

interface Product {
  id: number;
  category: string;
  name: string;
  originalPrice: string;
  discountedPrice: string;
  imageUrl: string;
  altText: string;
}

const products: Product[] = [
  {
    id: 1,
    category: 'Watches',
    name: 'Apple Watch Series 10',
    originalPrice: '$400.00',
    discountedPrice: '$123.00',
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-05/product-1.jpg',
    altText: 'Apple Watch Series 10 Image',
  },
  {
    id: 2,
    category: 'Shoes',
    name: 'Nike leather shoe',
    originalPrice: '$339.00',
    discountedPrice: '$199.00',
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-05/product-2.jpg',
    altText: 'Nike Leather Shoe Image',
  },
  {
    id: 3,
    category: 'Denim',
    name: 'Blook Denim Pants',
    originalPrice: '$300.00',
    discountedPrice: '$99.00',
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-05/product-3.jpg',
    altText: 'Blook Denim Pants Image',
  },
];

export default function ProductGrids5() {
  const [wishlist, setWishlist] = useState<{ [key: number]: boolean }>(
    products.reduce((acc, product) => ({ ...acc, [product.id]: false }), {}),
  );

  const toggleWishlist = (id: number) => {
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  return (
    <section className="bg-background-50 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="group relative cursor-pointer overflow-hidden"
            >
              <div className="relative overflow-hidden">
                <a href="javascript:void(0)" className="block">
                  <img
                    src={product.imageUrl}
                    className="w-full rounded-lg"
                    alt={product.altText}
                  />
                </a>
              </div>
              <div className="pt-5">
                <div className="flex items-start">
                  <div className="grow">
                    <span className="text-text-100 text-sm leading-5 font-medium">
                      {product.category}
                    </span>
                    <h3 className="text-title-50 mb-3 text-2xl font-medium">
                      <a href="javascript:void(0)">{product.name}</a>
                    </h3>
                    <p className="text-title-50 text-base font-medium">
                      <span className="text-text-100 line-through">
                        {product.originalPrice}
                      </span>
                      <span className="ml-2 inline-block">
                        {product.discountedPrice}
                      </span>
                    </p>
                  </div>
                  <div>
                    <Button
                      iconOnly
                      variant="ghost"
                      size="sm"
                      className={`cursor-pointer ${
                        wishlist[product.id]
                          ? 'text-primary-500'
                          : 'text-text-50'
                      }`}
                      onClick={() => toggleWishlist(product.id)}
                    >
                      <Heart
                        className={`${wishlist[product.id] ? 'text-primary-500' : 'text-text-50'}`}
                      />
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
