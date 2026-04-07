import { Button } from '@/components/core/button';
import { Trash1 } from '@tailgrids/icons';

interface Product {
  id: number;
  name: string;
  detail: string;
  price: string;
  imageUrl: string;
  altText: string;
}

const products: Product[] = [
  {
    id: 1,
    name: 'Premium Wireless Headphones',
    detail: 'Color: Matte Black',
    price: '$129.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/wishlists/wishlist-04/image-1.png',
    altText: 'Premium Wireless Headphones Image',
  },
  {
    id: 2,
    name: 'Premium Laptop',
    detail: 'Model: HP ENVY Laptop 17t-cw100',
    price: '$1299.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/wishlists/wishlist-04/image-2.png',
    altText: 'Premium Laptop Image',
  },
  {
    id: 3,
    name: 'Smartphone Pro',
    detail: 'Model: Huawei Pura 80',
    price: '$899.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/wishlists/wishlist-04/image-3.png',
    altText: 'Smartphone Pro Image',
  },
  {
    id: 4,
    name: 'Chronograph Steel Watch',
    detail: 'Color: Gold',
    price: '$150.59',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/wishlists/wishlist-04/image-4.png',
    altText: 'Chronograph Steel Watch Image',
  },
];

const ProductList: React.FC = () => {
  return (
    <ul className="divide-base-50 divide-y">
      {products.map((product) => (
        <li
          key={product.id}
          className="flex flex-col gap-6 px-2 py-6 sm:flex-row sm:items-center sm:gap-10 xl:p-6"
        >
          <div className="flex flex-1 gap-5">
            <div className="shrink-0">
              <img
                src={product.imageUrl}
                className="border-base-100 block h-20 w-20 rounded-lg border"
                alt={product.altText}
              />
            </div>
            <div className="w-full grow">
              <a
                href="javascript:void(0)"
                className="text-title-50 block text-base font-medium"
              >
                {product.name}
              </a>
              <p className="text-text-100 mb-3 text-sm font-normal">
                {product.detail}
              </p>
              <span className="text-title-50 block font-semibold">
                {product.price}
              </span>
            </div>
          </div>
          <div className="flex gap-5 sm:gap-10">
            <div>
              <Button appearance="outline">Add to cart</Button>
            </div>
            <div>
              <Button variant="ghost" iconOnly>
                <Trash1 className="size-5" />
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default function Wishlists4() {
  return (
    <section className="bg-background-50 py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="bg-background-soft-50 flex flex-col gap-3 rounded-2xl p-3 lg:flex-row">
          <div className="flex items-stretch lg:w-4/12">
            <div className="bg-background-50 rounded-xl p-5 sm:p-7">
              <h3 className="text-title-50 mb-3 text-4xl font-semibold">
                My Collection
              </h3>
              <p className="text-text-100 text-base">
                There are many variations of available but the majority have
                suffered alteration in some form.
              </p>
              <Button className="mt-11 px-5.5">
                <a href="javascript:void(0)">Browse More</a>
              </Button>
            </div>
          </div>
          <div className="lg:w-8/12">
            <div className="bg-background-50 rounded-xl p-3 xl:p-7">
              <ProductList />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
