interface Category {
  id: number;
  name: string;
  productCount: number;
  imageUrl: string;
  href: string;
  alt: string;
}

const categories: Category[] = [
  {
    id: 1,
    name: 'DSLR Camera',
    productCount: 50,
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-03/category-1.jpg',
    href: '#',
    alt: 'DSLR Camera category',
  },
  {
    id: 2,
    name: 'Wireless Earbuds',
    productCount: 45,
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-03/category-2.jpg',
    href: '#',
    alt: 'Wireless Earbuds category',
  },
  {
    id: 3,
    name: 'Wristwatch',
    productCount: 57,
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-03/category-3.jpg',
    href: '#',
    alt: 'Wristwatch category',
  },
  {
    id: 4,
    name: 'SkyFlyer Drone',
    productCount: 86,
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-03/category-4.jpg',
    href: '#',
    alt: 'SkyFlyer Drone category',
  },
  {
    id: 5,
    name: 'Smart Speaker',
    productCount: 38,
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-03/category-5.jpg',
    href: '#',
    alt: 'Smart Speaker category',
  },
];

export default function ProductCategories3() {
  return (
    <section className="bg-background-soft-100 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-8 max-w-xl text-left lg:mb-16">
          <h2 className="text-title-50 mb-4 text-3xl font-semibold lg:text-5xl">
            Shop by Category
          </h2>
          <p className="text-text-100 text-base">
            Explore our curated selection of products across premium categories,
            from everyday essentials to exclusive limited collections.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {categories.map((category) => (
            <article
              key={category.id}
              className="bg-background-50 rounded-xl p-2"
            >
              <a
                href={category.href}
                className="block overflow-hidden rounded-lg"
              >
                <img
                  src={category.imageUrl}
                  className="w-full transition-transform duration-300 ease-in-out hover:scale-110"
                  alt={category.alt}
                />
              </a>
              <div className="m-5 flex flex-col items-center text-center">
                <h3 className="text-title-50 mb-2 text-base font-medium">
                  {category.name}
                </h3>
                <p className="text-text-100 text-sm">
                  {category.productCount} Products
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
