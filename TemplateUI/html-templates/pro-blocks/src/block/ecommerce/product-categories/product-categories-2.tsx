import { ChevronRight } from '@tailgrids/icons';

interface Category {
  id: number;
  title: string;
  itemCount: string;
  imageUrl: string;
  href: string;
  alt: string;
  showExploreLink?: boolean;
  size: 'large' | 'medium' | 'wide';
}

const categories: Category[] = [
  {
    id: 1,
    title: 'Artisanal Footwear',
    itemCount: '186 Pieces',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-02/category-1.jpg',
    href: '#',
    alt: 'Artisanal Footwear category',
    showExploreLink: true,
    size: 'large',
  },
  {
    id: 2,
    title: 'Timepieces',
    itemCount: 'Timepieces',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-02/category-2.jpg',
    href: '#',
    alt: 'Timepieces category',
    size: 'medium',
  },
  {
    id: 3,
    title: 'Leather Essentials',
    itemCount: '147 Pieces',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-02/category-3.jpg',
    href: '#',
    alt: 'Leather Essentials category',
    size: 'medium',
  },
  {
    id: 4,
    title: 'Statement Outerwear',
    itemCount: '158 Pieces',
    imageUrl:
      ' https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-02/category-4.jpg',
    href: '#',
    alt: 'Statement Outerwear category',
    showExploreLink: true,
    size: 'wide',
  },
];

export default function ProductCategories2() {
  return (
    <section className="bg-background-50 py-10 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
          {/* Large category */}
          {categories
            .filter((category) => category.size === 'large')
            .map((category) => (
              <article
                key={category.id}
                className="relative w-full overflow-hidden rounded-xl lg:w-1/2"
              >
                <img
                  src={category.imageUrl}
                  className="h-full w-full rounded-lg object-cover"
                  alt={category.alt}
                />
                <div className="absolute inset-0 h-full w-full bg-linear-to-t from-black/60 to-black/10"></div>
                <div className="text-white-100 absolute right-0 bottom-0 left-0 flex items-end justify-between p-6">
                  <div>
                    <h3 className="text-white-100 text-xl font-medium sm:text-2xl">
                      {category.title}
                    </h3>
                    <p className="text-white-100-70 text-sm">
                      {category.itemCount}
                    </p>
                  </div>
                  {category.showExploreLink && (
                    <a
                      href={category.href}
                      className="group hidden items-center gap-1 text-sm font-medium hover:underline sm:flex"
                    >
                      Explore collection
                      <ChevronRight className="size-5 transition-transform group-hover:translate-x-1" />
                    </a>
                  )}
                </div>
              </article>
            ))}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Medium categories */}
            {categories
              .filter((category) => category.size === 'medium')
              .map((category) => (
                <article
                  key={category.id}
                  className="relative w-full overflow-hidden rounded-xl"
                >
                  <img
                    src={category.imageUrl}
                    className="h-full w-full rounded-lg object-cover"
                    alt={category.alt}
                  />
                  <div className="absolute inset-0 h-full w-full bg-linear-to-t from-black/60 to-black/10"></div>
                  <div className="text-white-100 absolute right-0 bottom-0 left-0 p-6">
                    <div>
                      <h3 className="text-white-100 text-xl font-medium sm:text-2xl">
                        {category.title}
                      </h3>
                      <p className="text-white-100-70 text-sm">
                        {category.itemCount}
                      </p>
                    </div>
                  </div>
                </article>
              ))}

            {/* Wide category */}
            {categories
              .filter((category) => category.size === 'wide')
              .map((category) => (
                <article
                  key={category.id}
                  className="relative col-span-full h-63 w-full overflow-hidden rounded-xl sm:h-auto"
                >
                  <img
                    src={category.imageUrl}
                    className="h-full w-full rounded-lg object-cover"
                    alt={category.alt}
                  />
                  <div className="absolute inset-0 h-full w-full bg-linear-to-t from-black/60 to-black/10"></div>
                  <div className="text-white-100 absolute right-0 bottom-0 left-0 flex items-end justify-between p-6">
                    <div>
                      <h3 className="text-white-100 text-xl font-medium sm:text-2xl">
                        <a href={category.href}>{category.title}</a>
                      </h3>
                      <p className="text-white-100-70 text-sm">
                        {category.itemCount}
                      </p>
                    </div>
                    {category.showExploreLink && (
                      <a
                        href={category.href}
                        className="group hidden items-center gap-1 text-sm font-medium hover:underline sm:flex"
                      >
                        Explore collection
                        <ChevronRight className="size-5 transition-transform group-hover:translate-x-1" />
                      </a>
                    )}
                  </div>
                </article>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
