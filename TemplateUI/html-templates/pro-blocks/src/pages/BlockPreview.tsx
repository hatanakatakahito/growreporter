import { Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBlock } from '../utils/blocks';

const BlockPreview = () => {
  const { category, subcategory, name } = useParams<{
    category: string;
    subcategory: string;
    name: string;
  }>();

  const block = getBlock(category || '', subcategory || '', name || '');

  if (!block) {
    return (
      <div className="p-8 text-center">
        Block not found: {category}/{subcategory}/{name}
      </div>
    );
  }

  const Component = block.component;

  return (
    <div>
      {/* Navigation Bar */}
      <div className="bg-background-50 border-base-100 fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b px-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            to={`/category/${category ?? ''}`}
            className="text-text-100 hover:text-primary-500 flex items-center text-sm font-medium transition-colors"
          >
            <svg
              className="mr-1 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back
          </Link>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
          <span className="text-text-100 text-sm font-semibold">
            {category} / {subcategory} / {name}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-14 min-h-[calc(100vh-3.5rem)]">
        <Suspense
          fallback={
            <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
              <div className="text-primary-500 text-lg font-medium">
                Loading Preview...
              </div>
            </div>
          }
        >
          <Component />
        </Suspense>
      </div>
    </div>
  );
};

export default BlockPreview;
