import { Button } from '@/components/core/button';
import { StarIcon } from '@tailgrids/icons';
import Navbar6 from '../navbar/navbar-6';

export default function Hero8() {
  return (
    <div className="bg-background-50 min-h-screen">
      <Navbar6 />
      <section className="bg-background-50 relative mx-auto max-w-[1440px] py-14 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 xl:px-0">
          <div className="flex flex-col items-center justify-between gap-20 lg:flex-row">
            <div className="w-full lg:w-1/2">
              <div className="max-w-[500px]">
                <span className="bg-badge-success-background text-badge-success-text inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium">
                  <span className="bg-badge-success-icon-color h-1.5 w-1.5 rounded-full"></span>
                  Available For New work
                </span>
                <h2 className="text-text-100 mt-5 text-2xl font-normal">
                  Hello! I am Samuel Moore
                </h2>
                <h1 className="text-title-50 mt-5 mb-4 text-left text-4xl leading-[52px] font-medium sm:text-5xl">
                  Creating with Purpose, Designing with Passion
                </h1>
                <div className="mt-8 flex w-full flex-col justify-start gap-5 sm:flex-row sm:items-center">
                  <Button className="h-12">Book A Call</Button>
                  <Button className="h-12" appearance="outline">
                    {' '}
                    See Portfolio
                  </Button>
                </div>
                <div className="mt-14 flex items-center gap-3.5 sm:mt-20">
                  <div>
                    <svg
                      className="block"
                      xmlns="http://www.w3.org/2000/svg"
                      width="36"
                      height="37"
                      viewBox="0 0 36 37"
                      fill="none"
                    >
                      <g clip-path="url(#clip0_9007_53576)">
                        <path
                          d="M26.7741 25.8759C24.9905 27.4792 22.6358 28.3679 20.0515 28.3679C14.3549 28.3679 10.1715 24.1844 10.1715 18.4408C10.1715 12.6971 14.2218 8.6897 20.0515 8.6897C22.5907 8.6897 24.9906 9.5354 26.8192 11.1387L28.0621 12.2076L33.5847 6.68707L32.2025 5.44004C28.9529 2.50571 24.6384 0.859375 20.0495 0.859375C9.81111 0.859375 2.37598 8.2474 2.37598 18.3978C2.37598 28.5051 9.98926 36.1573 20.0495 36.1573C24.7243 36.1573 29.0839 34.5109 32.2925 31.5296L33.6277 30.2825L28.0191 24.7661L26.7741 25.8759Z"
                          fill="black"
                        />
                        <path
                          d="M19.7813 12.6094C21.3518 12.6094 22.858 13.2333 23.9686 14.3439C25.0792 15.4544 25.7031 16.9606 25.7031 18.5313C25.7031 20.1019 25.0792 21.6081 23.9686 22.7186C22.858 23.8292 21.3518 24.4532 19.7813 24.4532C18.2107 24.4532 16.7044 23.8292 15.5938 22.7186C14.4832 21.6081 13.8594 20.1019 13.8594 18.5313C13.8594 16.9606 14.4832 15.4544 15.5938 14.3439C16.7044 13.2333 18.2107 12.6094 19.7813 12.6094Z"
                          fill="#FF3D2E"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_9007_53576">
                          <rect
                            width="36"
                            height="36"
                            fill="white"
                            transform="translate(0 0.5)"
                          />
                        </clipPath>
                      </defs>
                    </svg>
                    <svg
                      className="hidden"
                      xmlns="http://www.w3.org/2000/svg"
                      width="36"
                      height="37"
                      viewBox="0 0 36 37"
                      fill="none"
                    >
                      <g clip-path="url(#clip0_9007_53576)">
                        <path
                          d="M26.7741 25.8759C24.9905 27.4792 22.6358 28.3679 20.0515 28.3679C14.3549 28.3679 10.1715 24.1844 10.1715 18.4408C10.1715 12.6971 14.2218 8.6897 20.0515 8.6897C22.5907 8.6897 24.9906 9.5354 26.8192 11.1387L28.0621 12.2076L33.5847 6.68707L32.2025 5.44004C28.9529 2.50571 24.6384 0.859375 20.0495 0.859375C9.81111 0.859375 2.37598 8.2474 2.37598 18.3978C2.37598 28.5051 9.98926 36.1573 20.0495 36.1573C24.7243 36.1573 29.0839 34.5109 32.2925 31.5296L33.6277 30.2825L28.0191 24.7661L26.7741 25.8759Z"
                          fill="white"
                          fill-opacity="0.9"
                        />
                        <path
                          d="M19.7813 12.6094C21.3518 12.6094 22.858 13.2333 23.9686 14.3439C25.0792 15.4544 25.7031 16.9606 25.7031 18.5313C25.7031 20.1019 25.0792 21.6081 23.9686 22.7186C22.858 23.8292 21.3518 24.4532 19.7813 24.4532C18.2107 24.4532 16.7044 23.8292 15.5938 22.7186C14.4832 21.6081 13.8594 20.1019 13.8594 18.5313C13.8594 16.9606 14.4832 15.4544 15.5938 14.3439C16.7044 13.2333 18.2107 12.6094 19.7813 12.6094Z"
                          fill="#FF3D2E"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_9007_53576">
                          <rect
                            width="36"
                            height="36"
                            fill="white"
                            transform="translate(0 0.5)"
                          />
                        </clipPath>
                      </defs>
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon key={i} className="size-4 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-text-100 text-base">5.00 Star Review</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex lg:w-1/2 lg:justify-end">
              <div className="bg-background-soft-100 relative flex h-[455px] items-end justify-center rounded-3xl sm:w-[427px]">
                <div className="px-10">
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-08/image-1.png"
                    className="mx-auto w-full"
                    alt="person"
                  />
                </div>
                <ul>
                  <li className="bg-background-soft-100 ring-background-50 absolute -top-7 left-18 flex h-11 w-11 items-center justify-center rounded-full ring-4 sm:h-14 sm:w-14">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="27"
                      height="27"
                      viewBox="0 0 27 27"
                      fill="none"
                    >
                      <g clip-path="url(#clip0_9007_53798)">
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M13.2955 9.15312H22.1111V0.5H4.6424V0.58125L13.2955 9.15312Z"
                          fill="#67DBFF"
                        />
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M13.2959 9.15234H4.48029V17.8055H21.949V17.7242L13.2959 9.15234Z"
                          fill="#01A3FF"
                        />
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M4.48029 17.7656H13.2147V26.5L4.48029 17.7656Z"
                          fill="#0162FF"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_9007_53798">
                          <rect
                            width="26"
                            height="26"
                            fill="white"
                            transform="translate(0.295898 0.5)"
                          />
                        </clipPath>
                      </defs>
                    </svg>
                  </li>
                  <li className="bg-background-soft-100 ring-background-50 absolute top-24 -right-3 flex h-11 w-11 items-center justify-center rounded-full ring-4 sm:-right-7 sm:h-14 sm:w-14">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="27"
                      height="17"
                      viewBox="0 0 27 17"
                      fill="none"
                    >
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        d="M26.2957 0.5L17.9994 16.4925H10.2068L13.6788 9.86453H13.523C10.6587 13.5311 6.38501 15.9447 0.295654 16.4925V9.95624C0.295654 9.95624 4.19116 9.72937 6.48121 7.35522H0.295654V0.500126H7.24756V6.13834L7.40359 6.13772L10.2444 0.500126H15.5019V6.10259L15.658 6.10235L18.6053 0.5H26.2957Z"
                        fill="#146EF5"
                      />
                    </svg>
                  </li>
                  <li className="bg-background-soft-100 ring-background-50 absolute top-2/4 -left-3 flex h-11 w-11 items-center justify-center rounded-full ring-4 sm:-left-7 sm:h-14 sm:w-14">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="21"
                      height="31"
                      viewBox="0 0 21 31"
                      fill="none"
                    >
                      <g clip-path="url(#clip0_9007_53790)">
                        <path
                          d="M5.78788 30.5437C8.5439 30.5437 10.7807 28.3005 10.7807 25.5365V20.5293H5.78788C3.03187 20.5293 0.795105 22.7725 0.795105 25.5365C0.795105 28.3005 3.03187 30.5437 5.78788 30.5437Z"
                          fill="#0ACF83"
                        />
                        <path
                          d="M0.795105 15.5209C0.795105 12.7569 3.03187 10.5137 5.78788 10.5137H10.7807V20.5281H5.78788C3.03187 20.5281 0.795105 18.2849 0.795105 15.5209Z"
                          fill="#A259FF"
                        />
                        <path
                          d="M0.795044 5.50722C0.795044 2.74324 3.03181 0.5 5.78782 0.5H10.7806V10.5144H5.78782C3.03181 10.5144 0.795044 8.27121 0.795044 5.50722Z"
                          fill="#F24E1E"
                        />
                        <path
                          d="M10.7806 0.5H15.7734C18.5294 0.5 20.7662 2.74324 20.7662 5.50722C20.7662 8.27121 18.5294 10.5144 15.7734 10.5144H10.7806V0.5Z"
                          fill="#FF7262"
                        />
                        <path
                          d="M20.7662 15.5209C20.7662 18.2849 18.5294 20.5281 15.7734 20.5281C13.0174 20.5281 10.7806 18.2849 10.7806 15.5209C10.7806 12.7569 13.0174 10.5137 15.7734 10.5137C18.5294 10.5137 20.7662 12.7569 20.7662 15.5209Z"
                          fill="#1ABCFE"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_9007_53790">
                          <rect
                            width="20"
                            height="30"
                            fill="white"
                            transform="translate(0.795898 0.5)"
                          />
                        </clipPath>
                      </defs>
                    </svg>
                  </li>
                  <li className="absolute left-0 mt-5 flex items-start sm:bottom-10 sm:-left-36 sm:mt-0">
                    <span className="text-white-100 inline-flex items-center rounded-full bg-gray-800 px-5 py-2.5 text-sm">
                      UX/UI Designer
                    </span>
                    <svg
                      className="ml-2 block"
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="21"
                      viewBox="0 0 20 21"
                      fill="none"
                    >
                      <path
                        d="M18.52 5.17969C19.1525 2.94372 16.9759 0.862529 14.7329 1.67871L14.7319 1.67871L2.90869 5.9834C0.48555 6.86558 0.356792 10.1932 2.59717 11.3008L2.82178 11.4014L7.03857 13.0918L8.72803 17.3076C9.71853 19.7781 13.2353 19.7218 14.146 17.2207L18.4507 5.39648L18.52 5.17969Z"
                        fill="#1F2937"
                        stroke="white"
                        stroke-width="2"
                      />
                    </svg>
                    <svg
                      className="ml-2 hidden"
                      width="20"
                      height="21"
                      viewBox="0 0 20 21"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M18.52 5.17969C19.1525 2.94372 16.9759 0.862529 14.7329 1.67871L14.7319 1.67871L2.90869 5.9834C0.48555 6.86558 0.356792 10.1932 2.59717 11.3008L2.82178 11.4014L7.03857 13.0918L8.72803 17.3076C9.71853 19.7781 13.2353 19.7218 14.146 17.2207L18.4507 5.39648L18.52 5.17969Z"
                        fill="white"
                        fill-opacity="0.9"
                        stroke="#030712"
                        stroke-width="2"
                      />
                    </svg>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
