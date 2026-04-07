import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';

export default function Newsletter1() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="bg-background-soft-100 relative flex flex-col justify-between gap-10 overflow-hidden rounded-xl px-5 py-11 sm:p-11 lg:flex-row lg:items-center lg:gap-20">
          <div className="lg:w-1/2">
            <h2 className="text-title-50 mb-3 text-4xl font-medium">
              Subscribe Our Newletter
            </h2>
            <p className="text-text-100 text-base">
              Lorem ipsum dolor sit amet consectetur. Vitae dignissim odio vitae
              praesent egestas sollicitudin
            </p>
          </div>
          <div className="lg:w-1/2">
            <div className="relative z-20">
              <form>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3.5">
                  <Input
                    type="text"
                    placeholder="Enter your email"
                    className="h-11 sm:w-[295px] lg:w-full"
                  />
                  <Button className="shrink-0 px-8"> Subscribe</Button>
                </div>
              </form>
              <p className="text-text-100 mt-2.5 text-left text-base">
                Your privacy matters to us. Read our full
                <a href="javascript:void(0)" className="text-primary-500">
                  {' '}
                  Privacy Policy{' '}
                </a>
              </p>
            </div>
          </div>

          <svg
            className="pointer-events-none absolute top-0 right-0 block h-full"
            width="875"
            height="189"
            viewBox="0 0 875 189"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g opacity="0.56" filter="url(#filter0_f_9042_32187)">
              <rect
                x="250.92"
                y="-5.95728"
                width="271.72"
                height="720.753"
                rx="135.86"
                transform="rotate(-30 250.92 -5.95728)"
                fill="#3758F9"
              />
            </g>
            <g opacity="0.7">
              <g filter="url(#filter1_f_9042_32187)">
                <path
                  d="M769.6 -224.046C834.614 -61.8337 731.896 137.867 437.826 193.028C710.682 81.7127 713.575 -102.811 688.226 -240.327L769.6 -224.046Z"
                  fill="white"
                />
              </g>
              <g filter="url(#filter2_f_9042_32187)">
                <path
                  d="M835.379 -147.597C907.132 -47.5146 870.398 106.411 678.424 193.581C846.444 71.5477 817.413 -55.216 776.956 -145.063L835.379 -147.597Z"
                  fill="white"
                />
              </g>
              <g filter="url(#filter3_f_9042_32187)">
                <path
                  d="M614.719 -217.082C664.677 -87.6737 581.123 69.7884 347.157 110.588C564.855 25.0033 569.022 -121.426 550.298 -230.83L614.719 -217.082Z"
                  fill="url(#paint0_linear_9042_32187)"
                  fill-opacity="0.7"
                />
              </g>
              <g filter="url(#filter4_f_9042_32187)">
                <path
                  d="M514.685 -237.348C535.223 -100.559 419.355 34.3762 182.14 22.9939C413.244 -12.7403 220.224 -196.785 225.804 -307.297L514.685 -237.348Z"
                  fill="white"
                />
              </g>
            </g>
            <defs>
              <filter
                id="filter0_f_9042_32187"
                x="0.625977"
                y="-392.112"
                width="1096.28"
                height="1260.64"
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
                  stdDeviation="150"
                  result="effect1_foregroundBlur_9042_32187"
                />
              </filter>
              <filter
                id="filter1_f_9042_32187"
                x="377.53"
                y="-300.623"
                width="471.098"
                height="553.948"
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
                  stdDeviation="30.1482"
                  result="effect1_foregroundBlur_9042_32187"
                />
              </filter>
              <filter
                id="filter2_f_9042_32187"
                x="618.127"
                y="-207.893"
                width="311.609"
                height="461.771"
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
                  stdDeviation="30.1482"
                  result="effect1_foregroundBlur_9042_32187"
                />
              </filter>
              <filter
                id="filter3_f_9042_32187"
                x="304.95"
                y="-273.038"
                width="365.889"
                height="425.833"
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
                  stdDeviation="21.1038"
                  result="effect1_foregroundBlur_9042_32187"
                />
              </filter>
              <filter
                id="filter4_f_9042_32187"
                x="109.784"
                y="-379.653"
                width="479.583"
                height="475.675"
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
                  stdDeviation="36.1779"
                  result="effect1_foregroundBlur_9042_32187"
                />
              </filter>
              <linearGradient
                id="paint0_linear_9042_32187"
                x1="582.283"
                y1="-113.403"
                x2="159.866"
                y2="281.054"
                gradientUnits="userSpaceOnUse"
              >
                <stop stop-color="white" />
                <stop offset="1" stop-color="white" stop-opacity="0" />
              </linearGradient>
            </defs>
          </svg>

          <svg
            className="pointer-events-none absolute top-0 right-0 hidden h-full"
            width="875"
            height="189"
            viewBox="0 0 875 189"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g opacity="0.56" filter="url(#filter0_f_9042_32187)">
              <rect
                x="250.92"
                y="-5.95728"
                width="271.72"
                height="720.753"
                rx="135.86"
                transform="rotate(-30 250.92 -5.95728)"
                fill="#3758F9"
              />
            </g>
            <g opacity="0.7">
              <g filter="url(#filter1_f_9042_32187)">
                <path
                  d="M769.6 -224.046C834.614 -61.8337 731.896 137.867 437.826 193.028C710.682 81.7127 713.575 -102.811 688.226 -240.327L769.6 -224.046Z"
                  fill="#111827"
                />
              </g>
              <g filter="url(#filter2_f_9042_32187)">
                <path
                  d="M835.379 -147.597C907.132 -47.5146 870.398 106.411 678.424 193.581C846.444 71.5477 817.413 -55.216 776.956 -145.063L835.379 -147.597Z"
                  fill="#111827"
                />
              </g>
              <g filter="url(#filter3_f_9042_32187)">
                <path
                  d="M614.719 -217.082C664.677 -87.6737 581.123 69.7884 347.157 110.588C564.855 25.0033 569.022 -121.426 550.298 -230.83L614.719 -217.082Z"
                  fill="url(#paint0_linear_9042_32187)"
                  fill-opacity="0.7"
                />
              </g>
              <g filter="url(#filter4_f_9042_32187)">
                <path
                  d="M514.685 -237.348C535.223 -100.559 419.355 34.3762 182.14 22.9939C413.244 -12.7403 220.224 -196.785 225.804 -307.297L514.685 -237.348Z"
                  fill="#111827"
                />
              </g>
            </g>
            <defs>
              <filter
                id="filter0_f_9042_32187"
                x="0.625977"
                y="-392.112"
                width="1096.28"
                height="1260.64"
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
                  stdDeviation="150"
                  result="effect1_foregroundBlur_9042_32187"
                />
              </filter>
              <filter
                id="filter1_f_9042_32187"
                x="377.53"
                y="-300.623"
                width="471.098"
                height="553.948"
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
                  stdDeviation="30.1482"
                  result="effect1_foregroundBlur_9042_32187"
                />
              </filter>
              <filter
                id="filter2_f_9042_32187"
                x="618.127"
                y="-207.893"
                width="311.609"
                height="461.771"
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
                  stdDeviation="30.1482"
                  result="effect1_foregroundBlur_9042_32187"
                />
              </filter>
              <filter
                id="filter3_f_9042_32187"
                x="304.95"
                y="-273.038"
                width="365.889"
                height="425.833"
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
                  stdDeviation="21.1038"
                  result="effect1_foregroundBlur_9042_32187"
                />
              </filter>
              <filter
                id="filter4_f_9042_32187"
                x="109.784"
                y="-379.653"
                width="479.583"
                height="475.675"
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
                  stdDeviation="36.1779"
                  result="effect1_foregroundBlur_9042_32187"
                />
              </filter>
              <linearGradient
                id="paint0_linear_9042_32187"
                x1="582.283"
                y1="-113.403"
                x2="159.866"
                y2="281.054"
                gradientUnits="userSpaceOnUse"
              >
                <stop stop-color="#111827" />
                <stop offset="1" stop-color="white" stop-opacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </section>
  );
}
