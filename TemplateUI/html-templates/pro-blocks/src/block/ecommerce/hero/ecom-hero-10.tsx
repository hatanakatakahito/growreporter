import { Button } from '@/components/core/button';

export default function EcomHero10() {
  return (
    <section className="bg-background-50 pt-32 pb-24">
      <div className="relative mx-auto max-w-[1440px]">
        <div className="absolute -bottom-24 left-0 hidden items-end gap-2 xl:flex">
          <div className="relative z-30 space-y-2">
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-10/1-1.png"
              alt=""
            />
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-10/1-2.png"
              alt=""
            />
          </div>
          <div className="relative z-30">
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-10/1-3.png"
              alt=""
            />
          </div>
          <svg
            className="absolute bottom-0 z-0"
            xmlns="http://www.w3.org/2000/svg"
            width="427"
            height="318"
            viewBox="0 0 427 318"
            fill="none"
          >
            <g opacity="0.6" filter="url(#filter0_f_10788_6377)">
              <circle cx="180.5" cy="246.5" r="92.5" fill="#3758F9" />
            </g>
            <defs>
              <filter
                id="filter0_f_10788_6377"
                x="-66"
                y="0"
                width="493"
                height="493"
                filterUnits="userSpaceOnUse"
                color-interpolation-filters="sRGB"
              >
                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                <feBlend
                  mode="normal"
                  in="SourceGraphic"
                  in2="BackgroundImageFix"
                  result="shape"
                />
                <feGaussianBlur
                  stdDeviation="77"
                  result="effect1_foregroundBlur_10788_6377"
                />
              </filter>
            </defs>
          </svg>
        </div>
        <div className="absolute right-0 -bottom-24 hidden items-end gap-2 xl:flex">
          <div className="relative z-30">
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-10/2-1.jpg"
              className="rounded-t-lg"
              alt=""
            />
          </div>
          <div className="relative z-30 space-y-2">
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-10/2-2.jpg"
              className="rounded-l-lg"
              alt=""
            />
            <img
              src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-10/2-3.jpg"
              className="rounded-tl-lg"
              alt=""
            />
          </div>

          <svg
            className="absolute bottom-0 z-0"
            xmlns="http://www.w3.org/2000/svg"
            width="427"
            height="318"
            viewBox="0 0 427 318"
            fill="none"
          >
            <g opacity="0.6" filter="url(#filter0_f_10788_6377)">
              <circle cx="180.5" cy="246.5" r="92.5" fill="#3758F9" />
            </g>
            <defs>
              <filter
                id="filter0_f_10788_6377"
                x="-66"
                y="0"
                width="493"
                height="493"
                filterUnits="userSpaceOnUse"
                color-interpolation-filters="sRGB"
              >
                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                <feBlend
                  mode="normal"
                  in="SourceGraphic"
                  in2="BackgroundImageFix"
                  result="shape"
                />
                <feGaussianBlur
                  stdDeviation="77"
                  result="effect1_foregroundBlur_10788_6377"
                />
              </filter>
            </defs>
          </svg>
        </div>
        <div className="mx-auto max-w-3xl px-5">
          <h1 className="text-title-50 text-center text-4xl leading-none font-semibold sm:text-6xl">
            Unlock Premium Digital Products Instantly
          </h1>
          <p className="text-text-100 mt-4 text-center sm:px-16 lg:px-24">
            Browse a curated collection of templates, e-books, and design assets
            crafted to save you time and elevate your work
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5">
            <Button className="h-12 w-full sm:w-auto">
              {' '}
              Get Instant Access
            </Button>
            <Button appearance="outline" className="h-12 w-full sm:w-auto">
              {' '}
              Discover Look
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
