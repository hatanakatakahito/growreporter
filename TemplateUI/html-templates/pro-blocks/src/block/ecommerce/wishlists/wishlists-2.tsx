import { Button } from '@/components/core/button';
import { Trash1 } from '@tailgrids/icons';

interface Product {
  id: number;
  name: string;
  color: string;
  price: string;
  imageUrl: string;
  altText: string;
}

const products: Product[] = [
  {
    id: 1,
    name: 'Premium Wireless Headphones',
    color: 'Matte Black',
    price: '$129.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/wishlists/wishlist-02/image-1.png',
    altText: 'Premium Wireless Headphones Image',
  },
  {
    id: 2,
    name: 'Premium Wireless Headphones',
    color: 'Matte Black',
    price: '$129.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/wishlists/wishlist-02/image-2.png',
    altText: 'Premium Wireless Headphones Image',
  },
  {
    id: 3,
    name: 'Premium Wireless Headphones',
    color: 'Matte Black',
    price: '$129.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/wishlists/wishlist-02/image-3.png',
    altText: 'Premium Wireless Headphones Image',
  },
  {
    id: 4,
    name: 'Premium Wireless Headphones',
    color: 'Matte Black',
    price: '$129.99',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/wishlists/wishlist-02/image-4.png',
    altText: 'Premium Wireless Headphones Image',
  },
];

const ProductTable: React.FC = () => {
  return (
    <table className="bg-background-50 min-w-full">
      <thead>
        <tr className="border-base-100 border-b">
          <th className="text-title-50 min-w-[350px] p-6 text-left font-medium">
            Product
          </th>
          <th className="text-title-50 p-6 text-left font-medium whitespace-nowrap">
            Price
          </th>
          <th className="text-title-50 p-6 text-left font-medium whitespace-nowrap">
            Action
          </th>
        </tr>
      </thead>
      <tbody className="divide-base-100 divide-y">
        {products.map((product) => (
          <tr key={product.id}>
            <td className="p-6">
              <div className="flex items-center gap-5">
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
                    className="text-title-50 text-base font-medium"
                  >
                    {product.name}
                  </a>
                  <p className="text-text-100 mb-3 text-sm font-normal">
                    Color: {product.color}
                  </p>
                </div>
              </div>
            </td>
            <td className="text-title-50 p-6 text-base font-semibold whitespace-nowrap">
              {product.price}
            </td>
            <td className="p-6 whitespace-nowrap">
              <div className="flex items-center gap-10">
                <Button appearance="outline">Add to cart</Button>
                <Button
                  variant="ghost"
                  className="text-text-100 focus:ring-0 focus:outline-0"
                >
                  <Trash1 className="size-5" />
                  Remove
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default function Wishlists2() {
  return (
    <section className="bg-background-soft-100 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-xl text-center sm:px-5">
          <h2 className="text-title-50 mb-3 text-4xl font-semibold">
            Your Wishlist
          </h2>
          <p className="text-text-100 text-base">
            Save items you love and create collections for future inspiration.
            Discover new arrivals and explore curated edits to find your perfect
            pieces.
          </p>
        </div>
        <div className="mx-auto max-w-[850px] overflow-x-auto rounded-lg">
          <ProductTable />
        </div>
      </div>
    </section>
  );
}
