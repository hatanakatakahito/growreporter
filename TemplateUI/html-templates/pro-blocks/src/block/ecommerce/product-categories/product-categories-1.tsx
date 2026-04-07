interface Category {
  id: number;
  name: string;
  itemCount: number;
  imageUrl: string;
  href: string;
  alt: string;
}

const categories: Category[] = [
  {
    id: 1,
    name: 'Bag',
    itemCount: 25,
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-01/category-1.png',
    href: '#',
    alt: 'Bag category',
  },
  {
    id: 2,
    name: 'Earring',
    itemCount: 25,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-01/category-2.png',
    href: '#',
    alt: 'Earring category',
  },
  {
    id: 3,
    name: 'Watches',
    itemCount: 25,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-01/category-3.png',
    href: '#',
    alt: 'Watches category',
  },
  {
    id: 4,
    name: 'Wallet',
    itemCount: 25,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-01/category-4.png',
    href: '#',
    alt: 'Wallet category',
  },
  {
    id: 5,
    name: 'Ring',
    itemCount: 25,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-01/category-5.png',
    href: '#',
    alt: 'Ring category',
  },
  {
    id: 6,
    name: 'Bracelet',
    itemCount: 25,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-01/category-6.png',
    href: '#',
    alt: 'Bracelet category',
  },
];

export default function ProductCategories1() {
  return (
    <section className="bg-background-soft-300 min-h-screen py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-10 max-w-lg text-left lg:mb-16">
          <h2 className="text-title-50 mb-4 text-3xl font-semibold lg:text-5xl">
            Shop by Category
          </h2>
          <p className="text-text-100 text-base">
            Explore our curated selection of products across premium categories,
            from everyday essentials to exclusive limited collections.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {categories.map((category) => (
            <article key={category.id} className="flex flex-col items-center">
              <a
                href="javascript:void(0)"
                className="bg-background-50-100 block h-35 w-35 overflow-hidden rounded-full lg:h-43 lg:w-43"
              >
                <img
                  src={category.imageUrl}
                  className="h-full w-full object-cover transition-transform duration-300 ease-in-out hover:scale-110"
                  alt={category.alt}
                />
              </a>
              <div className="mt-5 text-center">
                <h3 className="text-title-50 mb-1 text-base font-medium">
                  <a href="javascript:void(0)">{category.name}</a>
                </h3>
                <p className="text-text-100 text-base">
                  {category.itemCount} Items
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
