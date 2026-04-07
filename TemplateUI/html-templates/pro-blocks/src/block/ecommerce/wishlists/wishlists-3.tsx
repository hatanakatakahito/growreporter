import { Button } from '@/components/core/button';
import { HalfStarIcon, StarIcon, Trash1 } from '@tailgrids/icons';
import { useState } from 'react';

interface FilterOption {
  id: string;
  label: string;
}

const filterOptions: FilterOption[] = [
  { id: 'all', label: 'All' },
  { id: 'stock', label: 'In Stock' },
  { id: 'sale', label: 'On Sale' },
  { id: 'drop', label: 'Price Drop' },
];

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  altText: string;
  status?: string; // Optional status like "In Stock" or "Only 2 Left"
  statusColor?: string; // Color for status badge (e.g., "green", "red")
}

const products: Product[] = [
  {
    id: 1,
    name: 'Tan Modern Dining Chair',
    description: 'Sleek design for dining or work',
    price: '$119.00',
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/wishlists/wishlist-03/image-1.jpg',
    altText: 'Tan Modern Dining Chair Image',
    status: 'In Stock',
    statusColor: 'green',
  },
  {
    id: 2,
    name: 'Plush Barrel Chair',
    description: 'Deep cushioning for cozy moments',
    price: '$249.00',
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/wishlists/wishlist-03/image-2.jpg',
    altText: 'Plush Barrel Chair Image',
  },
  {
    id: 3,
    name: 'Midnight Blue Accent Chair',
    description: 'Stylish support for any room',
    price: '$179.00',
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/wishlists/wishlist-03/image-3.jpg',
    altText: 'Midnight Blue Accent Chair Image',
    status: 'Only 2 Left',
    statusColor: 'red',
  },
];

export default function Wishlists3() {
  const [selected, setSelected] = useState<string>('all');
  return (
    <section className="bg-background-soft-100 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-10 max-w-md">
          <h2 className="text-title-50 mb-3 text-4xl font-semibold">
            My Collections
          </h2>
          <p className="text-text-100 text-base">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="bg-background-50 flex items-center justify-between rounded-lg p-3">
          <div className="hidden gap-2 sm:flex">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelected(option.id)}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  selected === option.id
                    ? 'bg-primary-50 text-primary-600 border-primary-500'
                    : 'border-base-100 text-text-50 hover:bg-background-soft-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="block sm:hidden">
            <select className="bg-input-background text-title-50 border-base-200 focus:border-primary-300 focus:ring-primary-100 cursor-pointer rounded-lg border px-4 py-2 text-sm focus:ring">
              <option value="0">All</option>
              <option value="1">In Stock</option>
              <option value="2">On Sale</option>
              <option value="3">Price Drop</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="short" className="text-text-100 text-sm">
              Short By :
            </label>
            <select
              id="short"
              className="bg-input-background border-base-200 text-title-50 focus:border-primary-300 focus:ring-primary-100 cursor-pointer rounded-lg border px-4 py-2 pr-10 text-sm focus:ring"
            >
              <option value="0">Newly Added</option>
              <option value="1">Last 3 Days</option>
              <option value="1">Last 7 Days</option>
            </select>
          </div>
        </div>
        <div className="mt-7 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="group bg-background-50 rounded-xl p-3"
            >
              <div className="relative overflow-hidden">
                {product.status && (
                  <span
                    className={`absolute top-4 left-4 inline-flex items-center gap-1.5 px-2 py-0.5 text-xs ${
                      product.statusColor === 'green'
                        ? 'bg-badge-success-background text-badge-success-text'
                        : 'bg-badge-error-background text-badge-error-text'
                    } rounded-full font-medium`}
                  >
                    <span
                      className={`h-1.5 w-1.5 ${
                        product.statusColor === 'green'
                          ? 'bg-badge-success-icon-color'
                          : 'bg-badge-error-icon-color'
                      } rounded-full`}
                    ></span>
                    {product.status}
                  </span>
                )}
                <button className="bg-background-50 border-base-200 absolute top-4 right-4 inline-flex h-11 w-11 translate-y-6 transform items-center justify-center rounded-full border opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  <Trash1 className="text-title-50" />
                </button>
                <a href="javascript:void(0)" className="block">
                  <img
                    src={product.imageUrl}
                    className="w-full rounded-lg"
                    alt={product.altText}
                  />
                </a>
              </div>
              <div className="px-3 pt-5 pb-3.5">
                <div className="mb-5 flex items-start">
                  <div className="grow">
                    <h3 className="text-title-50 mb-2 text-base font-semibold">
                      <a href="javascript:void(0)">{product.name}</a>
                    </h3>
                    <p className="text-text-100 mb-5 text-sm">
                      {product.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        <StarIcon className="size-3.5 text-yellow-400" />
                        <StarIcon className="size-3.5 text-yellow-400" />
                        <StarIcon className="size-3.5 text-yellow-400" />
                        <StarIcon className="size-3.5 text-yellow-400" />
                        <HalfStarIcon className="size-3.5 text-yellow-400" />
                      </div>
                      <span className="text-text-100 text-sm">
                        {product.id === 2
                          ? '5k+'
                          : product.id === 3
                            ? '2.5k+'
                            : '78+'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-title-50 text-xl font-medium">
                      {product.price}
                    </span>
                  </div>
                </div>
                <div>
                  <Button className="w-full" appearance="outline">
                    Add to Cart
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
