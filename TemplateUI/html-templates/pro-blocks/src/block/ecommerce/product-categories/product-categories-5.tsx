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
    name: 'Slate & White',
    itemCount: 75,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-05/category-1.jpg',
    href: '#',
    alt: 'Slate & White accessories',
  },
  {
    id: 2,
    name: 'Onyx & Red',
    itemCount: 57,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-05/category-2.jpg',
    href: '#',
    alt: 'Onyx & Red accessories',
  },
  {
    id: 3,
    name: 'Black & Silver',
    itemCount: 80,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-05/category-3.jpg',
    href: '#',
    alt: 'Black & Silver accessories',
  },
  {
    id: 4,
    name: 'Rose & Sliver',
    itemCount: 23,
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-05/category-4.jpg',
    href: '#',
    alt: 'Rose & Silver accessories',
  },
];

export default function ProductCategories5() {
  return (
    <section className="bg-background-50 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <h2 className="text-title-50 mb-4 text-3xl font-semibold lg:text-5xl">
            Timeless Accessories
          </h2>
          <p className="text-text-100 text-base">
            Explore our curated selection of products across premium categories,
            from everyday essentials to exclusive limited collections.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => (
            <article key={category.id}>
              <a
                href="javascript:void(0)"
                className="group relative block overflow-hidden rounded-lg"
              >
                <img
                  src={category.imageUrl}
                  className="w-full transition-transform duration-300 ease-in-out group-hover:scale-110"
                  alt={category.alt}
                />
                <div className="bg-background-50/90 absolute right-2 bottom-2 left-2 flex flex-col items-center rounded-xl p-3 text-center">
                  <h3 className="text-title-50 mb-1 text-base font-medium">
                    {category.name}
                  </h3>
                  <p className="text-text-100 text-sm">
                    {category.itemCount} Items
                  </p>
                </div>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
