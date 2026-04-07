import { Avatar } from '@/components/core/avatar';

const resourceLinks = [
  { label: 'Guides & Tutorials', href: '#' },
  { label: 'Community Forum', href: '#' },
  { label: 'API Docs', href: '#' },
  { label: 'Webinars', href: '#' },
];

const footerLinks = [
  { type: 'text', content: 'Based On ', highlight: 'Los Angeles' },
  { type: 'divider' },
  { type: 'link', label: 'Terms & Conditions', href: '#' },
  { type: 'divider' },
  { type: 'link', label: 'Privacy Policy', href: '#' },
  { type: 'divider' },
  { type: 'link', label: 'Cookie Settings', href: '#' },
];

export default function Footers6() {
  return (
    <footer className="relative w-full overflow-hidden bg-black">
      <svg
        className="absolute top-0 left-0"
        width="492"
        height="397"
        viewBox="0 0 492 397"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g filter="url(#filter0_f_8544_18821)">
          <path
            d="M62.7175 252.205L278.621 -23.3789L371.778 -23.3789L62.7175 252.205Z"
            fill="#A855F7"
          />
        </g>
        <g filter="url(#filter1_f_8544_18821)">
          <path
            d="M-61.9302 277L177.5 -28.6133L280.808 -28.6132L-61.9302 277Z"
            fill="#5E84FC"
          />
        </g>
        <defs>
          <filter
            id="filter0_f_8544_18821"
            x="-57.2825"
            y="-143.379"
            width="549.06"
            height="515.584"
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
              stdDeviation="60"
              result="effect1_foregroundBlur_8544_18821"
            />
          </filter>
          <filter
            id="filter1_f_8544_18821"
            x="-181.93"
            y="-148.613"
            width="582.739"
            height="545.613"
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
              stdDeviation="60"
              result="effect1_foregroundBlur_8544_18821"
            />
          </filter>
        </defs>
      </svg>

      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-8 pt-16 pb-14 lg:grid-cols-5 lg:pt-28">
          {/* <!-- Left Column - Branding and Chat --> */}
          <div className="lg:col-span-3">
            <h2 className="mb-1 text-3xl font-semibold text-white sm:text-4xl">
              Let's Create
            </h2>
            <p className="mb-10 text-3xl font-normal text-white/60 sm:text-4xl">
              Beautiful Website with TailGrids
            </p>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar
                  src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/footer/avatar-1.png"
                  className="size-10"
                  fallback="JD"
                />
                <span className="border-white-100/15 bg-success-500 absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-[1.5px]"></span>
              </div>
              <div>
                <p className="text-base font-semibold text-white">Chat</p>
                <p className="text-sm text-white/70">
                  Have any question? Let's Chat
                </p>
              </div>
            </div>
          </div>

          {/* <!-- Middle Column - Resources --> */}
          <div>
            <h3 className="text-white-80 mb-6 text-base font-medium">
              Resources
            </h3>

            <ul className="space-y-4">
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="hover:text-white-80 text-white-100 font-medium transition"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* <!-- Right Column - Contact --> */}
          <div>
            <h3 className="text-white-80 mb-6 text-base font-medium">
              Contact
            </h3>
            <ul className="space-y-4">
              <li className="text-white-100">
                <a
                  href="tel:+8940220232"
                  className="hover:text-white-80 font-medium transition"
                >
                  +894 022 0232
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@pipmp.com"
                  className="text-white-100 hover:text-white-80 font-medium transition"
                >
                  hello@pimjo.com
                </a>
              </li>
              <li className="text-white-100">
                1234 Innovation Street, Suite 567 New York, US
              </li>
            </ul>
          </div>
        </div>

        {/* <!-- Bottom Bar --> */}
        <div className="border-white-100/15 border-t py-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm lg:flex-row">
            <div className="flex flex-wrap justify-center gap-4 md:justify-start">
              {footerLinks.map((item, index) => {
                if (item.type === 'text') {
                  return (
                    <span key={index} className="text-white-80 text-sm">
                      {item.content}
                      <span className="font-semibold">{item.highlight}</span>
                    </span>
                  );
                }

                if (item.type === 'divider') {
                  return (
                    <span key={index} className="text-white-80 text-sm">
                      |
                    </span>
                  );
                }

                if (item.type === 'link') {
                  return (
                    <a
                      key={index}
                      href={item.href}
                      className="text-white-100 hover:text-white-80 text-sm transition"
                    >
                      {item.label}
                    </a>
                  );
                }

                return null;
              })}
            </div>
            <div>
              <p className="text-sm text-white/80">
                © Copyright 2025 - TailGrids.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
