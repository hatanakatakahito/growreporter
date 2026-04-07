import {
  Cart2,
  Eye,
  HalfStarIcon,
  Heart,
  StarIcon,
  Trash1,
} from '@tailgrids/icons';

interface Product {
  id: number;
  name: string;
  price: string;
  imageUrl: string;
  altText: string;
}

const products: Product[] = [
  {
    id: 1,
    name: 'SkyFlyer Drone',
    price: '$199.00',
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/wishlists/wishlist-01/image-1.jpg',
    altText: 'SkyFlyer Drone Image',
  },
  {
    id: 2,
    name: 'TechGadget Pro',
    price: '$149.00',
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/wishlists/wishlist-01/image-2.jpg',
    altText: 'TechGadget Pro Image',
  },
  {
    id: 3,
    name: 'SmartWatch X1',
    price: '$129.00',
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/wishlists/wishlist-01/image-3.jpg',
    altText: 'SmartWatch X1 Image',
  },
  {
    id: 4,
    name: 'SkyFlyer Drone', // Fourth item as per your request
    price: '$199.00',
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/wishlists/wishlist-01/image-4.jpg',
    altText: 'SkyFlyer Drone Image',
  },
  // Add more products as needed
];

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  return (
    <article className="group">
      <a href="javascript:void(0);" className="relative block">
        <img
          src={product.imageUrl}
          className="block w-full rounded-xl"
          alt={product.altText}
        />
        <button className="bg-background-50 text-title-50 border-base-200 absolute top-4 right-4 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border">
          <Trash1 className="size-5" />
        </button>
        <div className="bg-background-50 absolute right-2 bottom-2 left-2 flex h-12 translate-y-6 transform justify-between rounded-lg opacity-0 transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100">
          <button className="text-title-50 hover:bg-background-soft-50 border-base-100 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-l-lg border-r p-3">
            <Heart />
          </button>
          <button className="text-title-50 hover:bg-background-soft-50 flex flex-1 cursor-pointer items-center justify-center gap-3 p-3">
            <Cart2 />
            Add to cart
          </button>
          <button className="text-title-50 hover:bg-background-soft-50 border-base-100 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-r-lg border-l p-3">
            <Eye />
          </button>
        </div>
      </a>
      <div className="mt-5">
        <div className="flex items-center justify-between gap-5">
          <h3 className="text-text-100 font-medium">
            <a href="javascript:void(0);">{product.name}</a>
          </h3>
          <p className="text-title-50 text-base font-medium">{product.price}</p>
        </div>
        <div className="mt-3 flex items-center gap-0.5">
          <StarIcon className="size-3 text-yellow-400" />
          <StarIcon className="size-3 text-yellow-400" />
          <StarIcon className="size-3 text-yellow-400" />
          <StarIcon className="size-3 text-yellow-400" />
          <HalfStarIcon className="size-3 text-yellow-400" />
        </div>
      </div>
    </article>
  );
};

const Wishlists1: React.FC = () => {
  return (
    <section className="bg-background-50 py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-10 max-w-2xl lg:mb-16">
          <h2 className="text-title-50 mb-3 text-5xl font-semibold">
            Your Wishlist
          </h2>
          <p className="text-text-100 pr-10 text-base leading-6">
            Save items you love and create collections for future inspiration.
            Discover new arrivals and explore curated edits to find your perfect
            pieces.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Wishlists1;
