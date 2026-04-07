import { Button } from '@/components/core/button';
import { StarIcon } from '@tailgrids/icons';
import Navbar6 from '../navbar/navbar-6';

export default function Hero11() {
  return (
    <div className="bg-background-50 min-h-screen">
      <Navbar6 />
      <section className="bg-background-50 relative mx-auto max-w-[1440px] pt-14 lg:pt-28">
        <div className="mx-auto max-w-7xl px-4 xl:px-0">
          <div className="mx-auto max-w-[667px]">
            <h1 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-6xl sm:leading-16">
              Hello! I am Samuel Moore Product Designer
            </h1>
            <p className="text-text-100 text-center text-base sm:px-12">
              Passionate about designing clean interfaces and seamless user
              experiences.
            </p>
            <div className="mt-9 flex w-full flex-col justify-center gap-5 sm:flex-row sm:items-center">
              <Button size="lg" className="h-12">
                <a href="javascript:void(0)">Contact Now</a>
              </Button>
              <Button size="lg" className="h-12" appearance="outline">
                <a href="javascript:void(0)">See Portfolio</a>
              </Button>
            </div>
          </div>
          <div className="mx-auto mt-12 max-w-[1036px]">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end lg:gap-12 xl:gap-20">
              <div className="order-2 lg:order-1">
                <div>
                  <div className="flex -space-x-3">
                    <img
                      src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-11/avatar-1.png"
                      className="ring-background-50 h-10 w-10 rounded-full ring"
                      alt="avatar"
                    />
                    <img
                      src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-11/avatar-2.png"
                      className="ring-background-50 h-10 w-10 rounded-full ring"
                      alt="avatar"
                    />
                    <img
                      src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-11/avatar-3.png"
                      className="ring-background-50 h-10 w-10 rounded-full ring"
                      alt="avatar"
                    />
                  </div>
                  <div className="mt-3 lg:pb-16">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className="size-3.5 text-yellow-400"
                        />
                      ))}
                    </div>
                    <p className="text-text-100 text-sm">
                      5.00 Star Client Review
                    </p>
                  </div>
                </div>
              </div>
              <div className="order-1 mt-6 flex-1 sm:mt-0 lg:order-2 lg:px-10">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-11/image-1.png"
                  className="w-full rounded-b-2xl lg:rounded-b-none"
                  alt="person"
                />
              </div>
              <div className="order-3 space-y-8 lg:pb-16">
                <div>
                  <h2 className="text-title-50 text-5xl font-medium">5+</h2>
                  <p className="text-text-100 text-base font-normal">
                    Years of experience
                  </p>
                </div>
                <div>
                  <h2 className="text-title-50 text-5xl font-medium">120+</h2>
                  <p className="text-text-100 text-base font-normal">
                    Project Completed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden xl:block">
          <svg
            className="absolute top-0 left-0"
            width={227}
            height={450}
            viewBox="0 0 227 450"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M18.349 449.494V0h-.506v449.494h.506z"
              fill="url(#paint0_radial_9007_54346)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M226.764 244.454H-26.765v.506h253.529v-.506z"
              fill="url(#paint1_radial_9007_54346)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M70.452 449.494V0h-.506v449.494h.506z"
              fill="url(#paint2_radial_9007_54346)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M226.764 193.194H-26.765v.506h253.529v-.506z"
              fill="url(#paint3_radial_9007_54346)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M226.764 449.494H-26.765V450h253.529v-.506z"
              fill="url(#paint4_radial_9007_54346)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M122.556 449.494V0h-.506v449.494h.506z"
              fill="url(#paint5_radial_9007_54346)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M226.764 141.934H-26.765v.506h253.529v-.506z"
              fill="url(#paint6_radial_9007_54346)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M226.764 398.234H-26.765v.506h253.529v-.506z"
              fill="url(#paint7_radial_9007_54346)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M174.66 449.494V0h-.506v449.494h.506z"
              fill="url(#paint8_radial_9007_54346)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M226.764 90.674H-26.765v.506h253.529v-.506z"
              fill="url(#paint9_radial_9007_54346)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M226.764 346.974H-26.765v.506h253.529v-.506z"
              fill="url(#paint10_radial_9007_54346)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M226.764 39.414H-26.765v.506h253.529v-.506z"
              fill="url(#paint11_radial_9007_54346)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M226.764 295.714H-26.765v.506h253.529v-.506z"
              fill="url(#paint12_radial_9007_54346)"
              fillOpacity={0.3}
            />
            <path
              transform="matrix(0 1 1 0 18.35 91.18)"
              fill="#B2B2B2"
              fillOpacity={0.08}
              d="M0 0H50.7536V51.5982H0z"
            />
            <path
              transform="matrix(-1 0 0 1 174.235 296)"
              fill="#B2B2B2"
              fillOpacity={0.08}
              d="M0 0H52V51H0z"
            />
            <defs>
              <radialGradient
                id="paint0_radial_9007_54346"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(3.977 -3031.042 1419.8) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint1_radial_9007_54346"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(3.977 -3031.042 1419.8) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint2_radial_9007_54346"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(3.977 -3031.042 1419.8) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint3_radial_9007_54346"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(3.977 -3031.042 1419.8) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint4_radial_9007_54346"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(3.977 -3031.042 1419.8) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint5_radial_9007_54346"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(3.977 -3031.042 1419.8) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint6_radial_9007_54346"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(3.977 -3031.042 1419.8) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint7_radial_9007_54346"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(3.977 -3031.042 1419.8) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint8_radial_9007_54346"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(3.977 -3031.042 1419.8) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint9_radial_9007_54346"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(3.977 -3031.042 1419.8) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint10_radial_9007_54346"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(3.977 -3031.042 1419.8) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint11_radial_9007_54346"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(3.977 -3031.042 1419.8) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint12_radial_9007_54346"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(3.977 -3031.042 1419.8) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
            </defs>
          </svg>
          <svg
            className="absolute top-0 right-0"
            width={227}
            height={450}
            viewBox="0 0 227 450"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M208.416 449.494V0h.506v449.494h-.506z"
              fill="url(#paint0_radial_9007_54342)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0 244.454H253.53v.506H0v-.506z"
              fill="url(#paint1_radial_9007_54342)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M156.312 449.494V0h.506v449.494h-.506z"
              fill="url(#paint2_radial_9007_54342)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0 193.194H253.53v.506H0v-.506z"
              fill="url(#paint3_radial_9007_54342)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0 449.494H253.53V450H0v-.506z"
              fill="url(#paint4_radial_9007_54342)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M104.208 449.494V0h.506v449.494h-.506z"
              fill="url(#paint5_radial_9007_54342)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0 141.934H253.53v.506H0v-.506z"
              fill="url(#paint6_radial_9007_54342)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0 398.234H253.53v.506H0v-.506z"
              fill="url(#paint7_radial_9007_54342)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M52.105 449.494V0h.505v449.494h-.505z"
              fill="url(#paint8_radial_9007_54342)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0 90.674H253.53v.506H0v-.506z"
              fill="url(#paint9_radial_9007_54342)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0 346.974H253.53v.506H0v-.506z"
              fill="url(#paint10_radial_9007_54342)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0 39.414H253.53v.506H0v-.506z"
              fill="url(#paint11_radial_9007_54342)"
              fillOpacity={0.3}
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M0 295.714H253.53v.506H0v-.506z"
              fill="url(#paint12_radial_9007_54342)"
              fillOpacity={0.3}
            />
            <path
              transform="rotate(90 208.415 91.18)"
              fill="#B2B2B2"
              fillOpacity={0.08}
              d="M208.415 91.1797H259.16859999999997V142.7779H208.415z"
            />
            <path
              fill="#B2B2B2"
              fillOpacity={0.08}
              d="M52.5288 296H104.52879999999999V347H52.5288z"
            />
            <defs>
              <radialGradient
                id="paint0_radial_9007_54342"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(176.023 64.09 109.168) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint1_radial_9007_54342"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(176.023 64.09 109.168) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint2_radial_9007_54342"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(176.023 64.09 109.168) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint3_radial_9007_54342"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(176.023 64.09 109.168) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint4_radial_9007_54342"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(176.023 64.09 109.168) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint5_radial_9007_54342"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(176.023 64.09 109.168) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint6_radial_9007_54342"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(176.023 64.09 109.168) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint7_radial_9007_54342"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(176.023 64.09 109.168) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint8_radial_9007_54342"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(176.023 64.09 109.168) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint9_radial_9007_54342"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(176.023 64.09 109.168) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint10_radial_9007_54342"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(176.023 64.09 109.168) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint11_radial_9007_54342"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(176.023 64.09 109.168) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
              <radialGradient
                id="paint12_radial_9007_54342"
                cx={0}
                cy={0}
                r={1}
                gradientUnits="userSpaceOnUse"
                gradientTransform="rotate(176.023 64.09 109.168) scale(163.962 291.023)"
              >
                <stop stopColor="#B2B2B2" />
                <stop offset={1} stopColor="#B2B2B2" stopOpacity={0} />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </section>
    </div>
  );
}
