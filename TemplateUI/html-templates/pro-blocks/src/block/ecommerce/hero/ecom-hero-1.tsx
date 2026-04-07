import { Button } from '@/components/core/button';
import { ArrowRight } from '@tailgrids/icons';

export default function EcomHero1() {
  return (
    <section className="bg-background-50">
      <div className="mx-auto max-w-[1440px] p-6">
        <div className="bg-background-soft-100 rounded-2xl px-6 pt-6 sm:px-14 lg:pt-0">
          <div className="flex flex-col lg:flex-row lg:items-center">
            <div className="pb-16 lg:max-w-lg lg:py-38">
              <div className="mb-4 flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="16"
                  viewBox="0 0 15 16"
                  fill="none"
                >
                  <path
                    d="M5.93552 1.00529C5.76677 0.828102 5.51365 0.760602 5.2774 0.822477C5.04115 0.884352 4.85834 1.07279 4.79646 1.30904L4.35209 3.06685L2.60834 2.57466C2.37209 2.50716 2.11896 2.57466 1.9474 2.74623C1.77584 2.91779 1.70834 3.17091 1.77584 3.40716L2.26802 5.15091L0.510212 5.5981C0.273962 5.65716 0.0883366 5.84279 0.0236491 6.07904C-0.0410384 6.31529 0.0292741 6.5656 0.206462 6.73435L1.50584 7.99998L0.206462 9.2656C0.0292741 9.43435 -0.0382259 9.68748 0.0236491 9.92373C0.0855241 10.16 0.273962 10.3428 0.510212 10.4047L2.26802 10.849L1.77584 12.5928C1.70834 12.829 1.77584 13.0822 1.9474 13.2537C2.11896 13.4253 2.37209 13.4928 2.60834 13.4253L4.35209 12.9331L4.79646 14.6909C4.85552 14.9272 5.04115 15.1128 5.2774 15.1775C5.51365 15.2422 5.76396 15.1719 5.93552 14.9975L7.20115 13.6981L8.46677 14.9975C8.63834 15.1719 8.88865 15.2422 9.1249 15.1775C9.36115 15.1128 9.54396 14.9272 9.60584 14.6909L10.0502 12.9331L11.794 13.4253C12.0302 13.4928 12.2833 13.4253 12.4549 13.2537C12.6265 13.0822 12.694 12.829 12.6265 12.5928L12.1343 10.849L13.8921 10.4047C14.1283 10.3456 14.314 10.16 14.3786 9.92373C14.4433 9.68748 14.373 9.43435 14.1986 9.2656L12.8993 7.99998L14.1986 6.73435C14.373 6.56279 14.4433 6.31248 14.3786 6.07623C14.314 5.83998 14.1283 5.65717 13.8921 5.59529L12.1343 5.15091L12.6265 3.40716C12.694 3.17091 12.6265 2.91779 12.4549 2.74623C12.2833 2.57466 12.0302 2.50716 11.794 2.57466L10.0502 3.06685L9.60302 1.30904C9.54396 1.07279 9.35834 0.887165 9.12209 0.822477C8.88584 0.75779 8.63552 0.828102 8.46677 1.00529L7.20115 2.30466L5.93552 1.00529Z"
                    fill="#6B7280"
                  />
                </svg>
                <h3 className="text-text-100">Fall Collection 2025</h3>
              </div>
              <h1 className="text-title-50 mb-4 text-4xl font-medium sm:text-6xl">
                Elevate Your Style <br />
                <span className="text-text-200"> - Stay on Trend.</span>
              </h1>
              <p className="text-text-100 pr-14 text-base leading-6">
                Discover timeless pieces, crafted for comfort & style and Create
                your signature look with our premium collection.
              </p>
              <div className="mt-10 flex flex-col items-center gap-6 sm:flex-row">
                <Button className="w-full px-5 sm:w-auto">
                  <a href="javascript:void(0)">Shop Collection</a>
                </Button>
                <Button
                  variant="ghost"
                  className="group text-title-50 h-12 border-0 px-0"
                >
                  <a
                    href="javascript:void(0)"
                    className="flex items-center gap-2"
                  >
                    Explore Lookbook
                    <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </a>
                </Button>
              </div>
            </div>
            <div className="lg:mx-auto">
              <div>
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/headers/header-01/girl.png"
                  className="rounded-t-lg"
                  alt="girl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
