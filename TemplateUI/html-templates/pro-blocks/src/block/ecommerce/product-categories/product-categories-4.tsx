interface Collection {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  href: string;
  alt: string;
}

const collections: Collection[] = [
  {
    id: 1,
    title: 'Mens Collections',
    description:
      'Lorem ipsum dolor sit amet consectetur. Dignissim nunc neque massa rhoncus dignissim pharetra in.',
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-04/category-1.jpg',
    href: '#',
    alt: 'Mens Collections category',
  },
  {
    id: 2,
    title: 'Women Collections',
    description:
      'Lorem ipsum dolor sit amet consectetur. Dignissim nunc neque massa rhoncus dignissim pharetra in.',
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-04/category-2.jpg',
    href: '#',
    alt: 'Women Collections category',
  },
  {
    id: 3,
    title: "Kid's Collections",
    description:
      'Lorem ipsum dolor sit amet consectetur. Dignissim nunc neque massa rhoncus dignissim pharetra in.',
    imageUrl:
      'https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/categories/category-04/category-3.jpg',
    href: '#',
    alt: "Kid's Collections category",
  },
];

export default function ProductCategories4() {
  return (
    <section className="bg-background-50 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <article key={collection.id}>
              <a
                href="javascript:void(0)"
                className="block overflow-hidden rounded-lg"
              >
                <img
                  src={collection.imageUrl}
                  className="w-full transition-transform duration-300 ease-in-out hover:scale-105"
                  alt={collection.alt}
                />
              </a>
              <h3 className="text-title-50 mt-5 mb-1 text-2xl font-medium">
                <a href="javascript:void(0)">{collection.title}</a>
              </h3>
              <p className="text-text-100 text-sm leading-5">
                {collection.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
