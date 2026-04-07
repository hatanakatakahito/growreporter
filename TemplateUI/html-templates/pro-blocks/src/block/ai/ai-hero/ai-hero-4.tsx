import { MenuHamburger1, Xmark2x } from '@tailgrids/icons';
import { motion } from 'framer-motion';
import { useState } from 'react';

const images = [
  {
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-4/gimg-1.jpg',
    alt: 'one',
  },
  {
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-4/gimg-2.jpg',
    alt: 'Disney',
  },
  {
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-4/gimg-3.jpg',
    alt: 'Airbnb',
  },
  {
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-4/gimg-4.jpg',
    alt: 'Apple',
  },
  {
    src: 'https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-4/gimg-5.jpg',
    alt: 'Spark',
  },
];

export default function AiHero4() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <div>
      <header className="bg-background-50 sticky top-0 z-50 w-full">
        <nav className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
          <div className="flex items-center justify-between">
            {/* <!-- Logo --> */}
            <div className="flex lg:flex-1">
              <a
                href="javascript:void(0)"
                className="-m-1.5 flex items-center gap-2 p-1.5"
              >
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                  alt="logo"
                />
              </a>
            </div>

            {/* <!-- Navigation Menu --> */}
            <div className="hidden lg:gap-x-7 xl:flex">
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-primary-500 text-base leading-6 font-medium"
              >
                Features
              </a>
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-primary-500 text-base leading-6 font-medium"
              >
                Pricing
              </a>
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-primary-500 text-base leading-6 font-medium"
              >
                Product
              </a>
              <a
                href="javascript:void(0)"
                className="text-text-50 hover:text-primary-500 text-base leading-6 font-medium"
              >
                About
              </a>
            </div>

            {/* <!-- Sign In & Get Started --> */}
            <div className="hidden xl:flex xl:flex-1 xl:justify-end xl:gap-x-4">
              <a
                href="javascript:void(0)"
                className="text-title-50 hover:bg-background-soft-100 border-base-200 hover:text-title-50 inline-flex items-center justify-center rounded-lg border px-5 py-3 text-base leading-6 font-medium transition-colors"
              >
                Sign In
              </a>
              <a
                href="javascript:void(0)"
                className="bg-primary-500 hover:bg-primary-600 text-white-100 inline-flex items-center justify-center rounded-lg px-5 py-3 text-base font-medium transition-colors"
              >
                Get Started
              </a>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="hover:bg-background-soft-100 text-title-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-transparent transition-colors xl:hidden"
            >
              {mobileMenuOpen ? (
                <Xmark2x className="h-6 w-6" />
              ) : (
                <MenuHamburger1 className="h-6 w-6" />
              )}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="mt-4 xl:hidden">
              <div className="space-y-1 pt-2 pb-4">
                <a
                  href="javascript:void(0)"
                  className="hover:bg-background-soft-100 text-text-50 hover:text-title-50 block rounded-lg px-3 py-2 text-base font-medium"
                >
                  Features
                </a>
                <a
                  href="javascript:void(0)"
                  className="hover:bg-background-soft-100 text-text-50 hover:text-title-50 block rounded-lg px-3 py-2 text-base font-medium"
                >
                  Pricing
                </a>
                <a
                  href="javascript:void(0)"
                  className="hover:bg-background-soft-100 text-text-50 hover:text-title-50 block rounded-lg px-3 py-2 text-base font-medium"
                >
                  Product
                </a>
                <a
                  href="javascript:void(0)"
                  className="hover:bg-background-soft-100 text-text-50 hover:text-title-50 block rounded-lg px-3 py-2 text-base font-medium"
                >
                  About
                </a>
              </div>
              <div className="border-base-50 flex flex-col gap-3 border-t pt-5">
                <a
                  href="javascript:void(0)"
                  className="border-base-200 text-text-50 hover:text-title-50 hover:bg-background-soft-50 inline-flex w-full items-center justify-center rounded-lg border px-5 py-3 text-base font-medium transition-colors"
                >
                  Sign In
                </a>
                <a
                  href="javascript:void(0)"
                  className="bg-primary-500 hover:bg-primary-600 text-white-100 inline-flex w-full items-center justify-center rounded-lg px-5 py-3 text-base font-medium transition-colors"
                >
                  Get Started
                </a>
              </div>
            </div>
          )}
        </nav>
      </header>
      {/* <!-- Hero Section --> */}
      <section className="bg-background-soft-100 relative isolate">
        <div className="mx-auto max-w-7xl px-4 pt-20 sm:pt-25 xl:px-0">
          <div className="mx-auto max-w-5xl px-5">
            {/* <!-- New Badge --> */}
            <div className="mb-6 flex justify-center">
              <div className="text-text-50 ring-background-soft-400 inline-flex h-7 items-center gap-1.5 rounded-full p-1 pr-4 pl-0.5 font-medium ring-1">
                <div className="flex -space-x-2">
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-2/avatar.png"
                    className="ring-background-50 h-6 w-6 rounded-full ring"
                    alt="avatar"
                  />
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-2/avatar-2.png"
                    className="ring-background-50 h-6 w-6 rounded-full ring"
                    alt="avatar"
                  />
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-2/avatar-3.png"
                    className="ring-background-50 h-6 w-6 rounded-full ring"
                    alt="avatar"
                  />
                </div>
                <span className="text-text-50 text-xs">
                  Trusted by 20k+ User
                </span>
              </div>
            </div>
            {/* <!-- Main Heading --> */}
            <h1 className="text-title-50 mb-8 text-center text-4xl font-medium sm:mb-12 sm:text-6xl sm:leading-16">
              Effortlessly Create Stunning Visuals
            </h1>
          </div>
          <div className="mx-auto max-w-[677px] pb-14 sm:pb-30">
            <div className="relative">
              <div className="relative z-30">
                <input
                  type="text"
                  className="bg-background-50 h-18 w-full rounded-full border-0 px-8 py-3 pr-40 focus:ring-0"
                  placeholder="Generate a modern and futuristic high quality background image"
                />
                <button className="hover:bg-primary-600 bg-primary-500 text-white-100 absolute top-1/2 right-3 flex -translate-y-1/2 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-medium transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="25"
                    height="24"
                    viewBox="0 0 25 24"
                    fill="none"
                  >
                    <g clip-path="url(#clip0_11922_76)">
                      <path
                        d="M11.3562 7.22154L12.0811 8.88213C12.7264 10.3598 13.8877 11.5362 15.3363 12.1792L17.3319 13.065C17.9663 13.3466 17.9663 14.2696 17.3319 14.5512L15.3986 15.4094C13.9127 16.069 12.7306 17.2889 12.0964 18.817L11.362 20.5867C11.0895 21.2434 10.1821 21.2434 9.9096 20.5867L9.17519 18.817C8.541 17.2889 7.35884 16.069 5.87298 15.4094L3.93972 14.5512C3.30525 14.2696 3.30525 13.3466 3.93972 13.065L5.93531 12.1792C7.38392 11.5362 8.54525 10.3598 9.19045 8.88213L9.91547 7.22154C10.1942 6.58331 11.0774 6.58331 11.3562 7.22154ZM18.615 3.17844L18.8188 3.64575C19.1823 4.47894 19.837 5.14237 20.6538 5.50527L21.282 5.7844C21.6217 5.93533 21.6217 6.42908 21.282 6.58L20.689 6.84352C19.8511 7.21576 19.1847 7.90372 18.8274 8.76524L18.6181 9.27023C18.4721 9.62214 17.9856 9.62214 17.8396 9.27023L17.6303 8.76524C17.2731 7.90372 16.6067 7.21576 15.7688 6.84352L15.1757 6.58C14.836 6.42908 14.836 5.93533 15.1757 5.7844L15.8039 5.50527C16.6208 5.14237 17.2754 4.47894 17.6389 3.64575L17.8428 3.17844C17.992 2.83635 18.4657 2.83635 18.615 3.17844Z"
                        stroke="white"
                        strokeWidth="1.5"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_11922_76">
                        <rect
                          width="24"
                          height="24"
                          fill="white"
                          transform="translate(0.5)"
                        />
                      </clipPath>
                    </defs>
                  </svg>
                  Generate
                </button>
              </div>
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/ai/ai-hero/hero-4/shape.png"
                className="absolute -bottom-10 z-10 w-full sm:-bottom-12 lg:-bottom-17"
                alt="shape"
              />
            </div>
          </div>
        </div>
        <div className="w-full overflow-hidden mask-[linear-gradient(to_right,transparent_0,black_128px,black_calc(100%-128px),transparent_100%)] pb-16 sm:pb-25">
          <motion.div
            className="flex w-max items-center"
            animate={{ x: '-50%' }}
            transition={{
              duration: 20,
              ease: 'linear',
              repeat: Infinity,
            }}
          >
            {[...images, ...images].map((img, index) => (
              <div key={index} className="mx-2 shrink-0">
                <img
                  src={img.src}
                  className="border-white-100 rounded-3xl border-8"
                  alt={img.alt}
                />
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
