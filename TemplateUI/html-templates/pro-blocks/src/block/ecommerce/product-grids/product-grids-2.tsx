import { Badge } from '@/components/core/badge';
import { Button } from '@/components/core/button';
import {
  ArrowBothDirectionHorizontal2,
  Cart2,
  Eye,
  Heart,
} from '@tailgrids/icons';
import { useState } from 'react';

// Replaced inline icons with shared icons from @tailgrids/icons — inlined svg definitions removed

interface Product {
  id: number;
  name: string;
  price: string;
  imageUrl: string;
  altText: string;
  colors: string[];
  status?: string;
}

const products: Product[] = [
  {
    id: 1,
    name: 'Classic Cream Satchel',
    price: '$150.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-02/product-1.jpg',
    altText: 'Classic Cream Satchel Image',
    colors: ['#DBCDB9', '#173458'],
  },
  {
    id: 2,
    name: 'Black City Tote',
    price: '$175.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-02/product-2.jpg',
    altText: 'Black City Tote Image',
    colors: ['#173458', '#C7E5FF'],
    status: 'Hot Item',
  },
  {
    id: 3,
    name: 'Caramel Shoulder Bag',
    price: '$144.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-02/product-3.jpg',
    altText: 'Caramel Shoulder Bag Image',
    colors: ['#FBD9A9', '#363636'],
  },
  {
    id: 4,
    name: 'Ivory Chain Purse',
    price: '$179.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-02/product-4.jpg',
    altText: 'Ivory Chain Purse Image',
    colors: ['#DBCDB9', '#173A58'],
  },
  {
    id: 5,
    name: 'White Mini Crossbody',
    price: '$119.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-02/product-5.jpg',
    altText: 'White Mini Crossbody Image',
    colors: ['#DBB9CF', '#173A58'],
  },
  {
    id: 6,
    name: 'Vintage Brown Handbag',
    price: '$244.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-02/product-6.jpg',
    altText: 'Vintage Brown Handbag Image',
    colors: ['#A87E67'],
    status: 'Hot Item',
  },
  {
    id: 7,
    name: 'Modern Hobo Bag',
    price: '$399.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-02/product-7.jpg',
    altText: 'Modern Hobo Bag Image',
    colors: ['#E5DDD2', '#581730'],
  },
  {
    id: 8,
    name: 'Sleek White Clutch',
    price: '$245.00',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/product-grids/products-grid-02/product-8.jpg',
    altText: 'Sleek White Clutch Image',
    colors: ['#DBCDB9'],
  },
];

export default function ProductGrids2() {
  const [selectedColors, setSelectedColors] = useState<{
    [key: number]: string;
  }>(
    products.reduce(
      (acc, product) => ({ ...acc, [product.id]: product.colors[0] }),
      {},
    ),
  );
  return (
    <section className="bg-background-soft-100 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-3 lg:gap-y-9 xl:grid-cols-4">
          {products.map((product) => (
            <article key={product.id} className="relative cursor-pointer">
              <div className="group relative overflow-hidden">
                {product.status && (
                  <Badge
                    size="sm"
                    color="primary"
                    className="absolute top-4 left-4"
                  >
                    {product.status}
                  </Badge>
                )}
                <a href="javascript:void(0)" className="block">
                  <img
                    src={product.imageUrl}
                    className="w-full rounded-xl"
                    alt={product.altText}
                  />
                </a>
                <div className="absolute right-4 bottom-4 left-4 translate-y-6 transform opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  <Button
                    appearance="outline"
                    className="h-11 w-full text-base font-medium"
                  >
                    <Cart2 />
                    Add to cart
                  </Button>
                </div>
                <div className="absolute top-4 right-4 flex translate-y-6 transform flex-col gap-2 opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  <Button
                    iconOnly
                    appearance="outline"
                    size="sm"
                    className="text-title-50 bg-background-50 hover:bg-background-soft-100 rounded-full"
                  >
                    <Heart />
                  </Button>
                  <Button
                    iconOnly
                    appearance="outline"
                    size="sm"
                    className="text-title-50 bg-background-50 hover:bg-background-soft-100 rounded-full"
                  >
                    <Eye />
                  </Button>
                  <Button
                    iconOnly
                    appearance="outline"
                    size="sm"
                    className="text-title-50 bg-background-50 hover:bg-background-soft-100 rounded-full"
                  >
                    <ArrowBothDirectionHorizontal2 />
                  </Button>
                </div>
              </div>
              <div className="pt-5">
                <h3 className="text-title-50 mb-1 text-base font-medium">
                  <a href="javascript:void(0)">{product.name}</a>
                </h3>
                <p className="text-text-100 text-base font-normal">
                  {product.price}
                </p>
                <ul className="mt-4 flex items-center gap-2">
                  {product.colors.map((color, index) => (
                    <li
                      key={index}
                      className={`h-5 w-5 cursor-pointer rounded-full transition-all ${
                        selectedColors[product.id] === color
                          ? 'ring-foreground-soft-500 ring-1 ring-offset-1'
                          : ''
                      }`}
                      style={{ '--color': color } as React.CSSProperties}
                      onClick={() =>
                        setSelectedColors((prev) => ({
                          ...prev,
                          [product.id]: color,
                        }))
                      }
                    ></li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
