import {
  Brush2,
  Code1,
  DashboardSquare1,
  EmojiSmile,
  FileImage,
  FontSquare,
  Layout20,
  MenuBento1,
} from '@tailgrids/icons';

interface Category {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
}

const categories: Category[] = [
  {
    id: 1,
    title: 'UI Kits',
    description:
      'Bundles of reusable UI components & screens to speed up design.',
    icon: <MenuBento1 className="size-5" />,
    href: '#',
  },
  {
    id: 2,
    title: 'Website Template',
    description:
      'Bundles of reusable UI components & screens to speed up design.',
    icon: <Layout20 className="size-5" />,
    href: '#',
  },
  {
    id: 3,
    title: 'Icon Pack',
    description:
      'Bundles of reusable UI components & screens to speed up design.',
    icon: <EmojiSmile className="size-5" />,
    href: '#',
  },
  {
    id: 4,
    title: 'Font',
    description:
      'Bundles of reusable UI components & screens to speed up design.',
    icon: <FontSquare className="size-5" />,
    href: '#',
  },
  {
    id: 5,
    title: 'Dashboard UI',
    description:
      'Bundles of reusable UI components & screens to speed up design.',
    icon: <DashboardSquare1 className="size-5" />,
    href: '#',
  },
  {
    id: 6,
    title: 'Mockup',
    description:
      'Bundles of reusable UI components & screens to speed up design.',
    icon: <FileImage className="size-5" />,
    href: '#',
  },
  {
    id: 7,
    title: 'Illustration',
    description:
      'Bundles of reusable UI components & screens to speed up design.',
    icon: <Brush2 className="size-5" />,
    href: '#',
  },
  {
    id: 8,
    title: 'Coded Template',
    description:
      'Bundles of reusable UI components & screens to speed up design.',
    icon: <Code1 className="size-5" />,
    href: '#',
  },
];

export default function ProductCategories6() {
  return (
    <section className="bg-background-50 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-11 flex flex-col items-center justify-between gap-3 sm:mb-16 sm:flex-row sm:items-end">
          <h3 className="text-title-50 text-3xl font-semibold sm:text-5xl">
            All Category
          </h3>
          <a
            href="javascript:void(0)"
            className="text-title-50 hover:text-primary-500 text-base font-medium"
          >
            Sell All Resources
          </a>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => (
            <article
              key={category.id}
              className="hover:border-primary-500 border-base-100 flex gap-5 rounded-xl border p-5 transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="bg-background-soft-100 text-text-50 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                {category.icon}
              </div>
              <div>
                <h3 className="text-title-50 mb-1 text-base font-medium">
                  {category.title}
                </h3>
                <p className="text-text-100 text-sm leading-5">
                  {category.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
