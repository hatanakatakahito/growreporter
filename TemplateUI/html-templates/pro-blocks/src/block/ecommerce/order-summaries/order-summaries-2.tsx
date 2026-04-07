import { BoxUser, Check, ThreeDCube1, TruckDelivery2x } from '@tailgrids/icons';

export default function OrderSummaries2() {
  return (
    <section className="bg-background-soft-100 pb-28">
      <div className="border-base-100 bg-background-soft-50 border-b pt-28 pb-16">
        <div className="mx-auto max-w-7xl px-4 xl:px-0">
          <div className="bg-background-50 rounded-2xl p-5 sm:px-7 sm:py-11">
            <h2 className="text-title-50 mb-8 text-lg font-semibold sm:text-center">
              Order Progress
            </h2>
            <div className="relative mx-auto flex max-w-[900px] flex-col items-start justify-between gap-10 sm:flex-row sm:items-center">
              {/* <!-- Progress Line --> */}
              <div className="bg-background-soft-100 absolute top-5 left-0 z-0 hidden h-1 w-full rounded-full sm:block"></div>
              <div className="bg-primary-500 absolute top-5 left-0 z-0 hidden h-1 w-1/4 rounded-full sm:block"></div>

              <div className="bg-primary-500 absolute -top-5 left-5 z-10 block h-1/4 w-1 rounded-full sm:hidden"></div>

              <div className="bg-background-soft-100 absolute -top-5 left-5 z-0 block h-full w-1 rounded-full sm:hidden"></div>

              {/* <!-- Step 1 --> */}
              <div className="relative z-10 flex items-start gap-6 sm:w-35 sm:flex-col sm:items-center sm:gap-0">
                <div className="bg-primary-500 text-white-100 flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                  <Check className="size-8" />
                </div>
                <div className="text-left sm:text-center">
                  <p className="text-text-50 text-base font-semibold sm:mt-3">
                    Order Confirmed
                  </p>
                  <span className="text-text-100 text-sm">12 June 2025</span>
                </div>
              </div>

              {/* <!-- Step 2 --> */}
              <div className="relative z-10 flex items-start gap-6 sm:w-32 sm:flex-col sm:items-center sm:gap-0">
                <div className="bg-background-50 text-text-50 border-base-200 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border">
                  <ThreeDCube1 className="size-6" />
                </div>
                <div className="text-left sm:text-center">
                  <p className="text-text-50 text-base font-semibold sm:mt-3">
                    Processing
                  </p>
                  <span className="text-text-100 text-sm">13 June 2025</span>
                </div>
              </div>

              {/* <!-- Step 3 --> */}
              <div className="relative z-10 flex items-start gap-6 sm:w-32 sm:flex-col sm:items-center sm:gap-0">
                <div className="bg-background-50 text-text-50 border-base-200 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border">
                  <TruckDelivery2x className="size-6" />
                </div>
                <div className="text-left sm:text-center">
                  <p className="text-text-50 text-base font-semibold sm:mt-3">
                    Shipped
                  </p>
                  <span className="text-text-100 text-sm">14 June 2025</span>
                </div>
              </div>

              {/* <!-- Step 4 --> */}
              <div className="relative z-10 flex items-start gap-6 sm:w-32 sm:flex-col sm:items-center sm:gap-0">
                <div className="bg-background-50 text-text-50 border-base-200 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border">
                  <BoxUser className="size-6" />
                </div>
                <div className="text-left sm:text-center">
                  <p className="text-text-50 text-base font-semibold sm:mt-3">
                    Delivered
                  </p>
                  <span className="text-text-100 text-sm">15 June 2025</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="0 grid grid-cols-1 gap-6 pt-16 lg:grid-cols-12">
          <div className="bg-background-50 rounded-2xl p-7 shadow-sm lg:col-span-4 xl:col-span-5">
            <h3 className="text-title-50 text-xl font-semibold">
              Order Summery
            </h3>
            <ul className="py-7">
              <li className="flex gap-6">
                <img
                  src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/order-summaries/order-summary-02/product.jpg"
                  className="h-18 w-18 shrink-0 rounded-lg"
                  alt=""
                />
                <div className="flex-1">
                  <h3 className="text-title-50 text-base font-medium">
                    Selvedge demin jeans
                  </h3>
                  <p className="text-text-100 text-sm">jeans - 1x • Size M</p>
                  <p className="text-text-50 mt-1 text-sm font-semibold">
                    $129.00
                  </p>
                </div>
              </li>
            </ul>
            <ul className="border-base-50 border-b pb-5">
              <li className="text-text-50 flex justify-between pb-2.5 text-base">
                <span>Subtotal</span>
                <span className="font-medium">$129</span>
              </li>
              <li className="text-text-50 flex justify-between py-2.5 text-base">
                <span>Taxes</span>
                <span className="font-medium">$15.25</span>
              </li>
              <li className="text-text-50 flex justify-between py-2.5 text-base">
                <span>Shipping</span>
                <span className="font-medium">Free</span>
              </li>
            </ul>
            <div className="text-title-50 flex justify-between pt-5 font-semibold">
              <span className="text-title-50 text-lg font-medium">Total</span>
              <span className="text-title-50 text-lg font-medium">$144.25</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-8 xl:col-span-7">
            <div className="bg-background-50 rounded-2xl p-7 shadow-sm sm:col-span-full">
              <h3 className="text-title-50 mb-7 text-xl font-semibold">
                Customer Details
              </h3>
              <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <li>
                  <span className="text-text-50 mb-1 inline-block font-semibold">
                    Name
                  </span>
                  <p className="text-text-100 text-sm">Musharof Chowdhury </p>
                </li>
                <li>
                  <span className="text-text-50 mb-1 inline-block font-semibold">
                    Email
                  </span>
                  <p className="text-text-100 text-sm">hello@pimjo.com</p>
                </li>
                <li>
                  <span className="text-text-50 mb-1 inline-block font-semibold">
                    Shipping Address
                  </span>
                  <address className="text-text-100 text-sm not-italic">
                    Level 2, House 03, Road 05, Baridhara J Block, Dhaka 1212
                  </address>
                </li>
                <li>
                  <span className="text-text-50 mb-1 inline-block font-semibold">
                    Shipping Address
                  </span>
                  <address className="text-text-100 text-sm not-italic">
                    Pimjo LLC - 30 N Gould St Ste R Sheridan, WY 82801, USA
                  </address>
                </li>
              </ul>
            </div>
            <div className="bg-background-50 rounded-2xl p-7 shadow-sm">
              <h3 className="text-title-50 mb-7 text-xl font-semibold">
                Payment Method
              </h3>
              <div className="flex gap-4">
                <div className="bg-background-soft-100 inline-flex h-12 w-12 items-center justify-center rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                  >
                    <path
                      d="M2 16C2 8.26801 8.26801 2 16 2C23.732 2 30 8.26801 30 16C30 23.732 23.732 30 16 30C8.26801 30 2 23.732 2 16Z"
                      fill="#172A73"
                    />
                    <path
                      d="M5.57422 9.74414V10.3399L7.75216 10.6828C9.29537 10.9258 10.5391 12.0857 10.8987 13.6173L13.4482 24.477C13.5113 24.7458 13.7495 24.9356 14.0236 24.9356H17.6013C17.8373 24.9356 18.0507 24.7942 18.1442 24.5759L24.3157 10.16C24.3999 9.96336 24.2568 9.74414 24.0442 9.74414H20.7479C20.5099 9.74414 20.2951 9.88796 20.2029 10.1091L16.0686 20.0207L14.4194 11.2005C14.2615 10.3559 13.5293 9.74414 12.6764 9.74414H5.57422Z"
                      fill="white"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-text-50 text-base font-medium">
                    Visa Ending 1345
                  </h4>
                  <p className="text-text-100 text-sm">Charged on June 12</p>
                </div>
              </div>
            </div>
            <div className="bg-background-50 rounded-2xl p-7 shadow-sm">
              <h3 className="text-title-50 mb-7 text-xl font-semibold">
                Shipping Method
              </h3>
              <div className="flex gap-4">
                <div className="bg-background-soft-100 inline-flex h-12 w-12 items-center justify-center rounded-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="35"
                    height="10"
                    viewBox="0 0 35 10"
                    fill="none"
                  >
                    <g clip-path="url(#clip0_9701_52817)">
                      <path
                        d="M34.2909 8.4859C34.2909 7.9621 33.9194 7.57854 33.4077 7.57854C32.8969 7.57854 32.525 7.9621 32.525 8.4859C32.525 9.00885 32.8969 9.39177 33.4077 9.39177C33.9194 9.39177 34.2909 9.00822 34.2909 8.4859ZM33.1757 8.53244V9.12509H32.9842V7.81824H33.46C33.7388 7.81824 33.8667 7.94 33.8667 8.17736C33.8667 8.32355 33.7679 8.43936 33.6406 8.45615V8.46168C33.7511 8.47931 33.7917 8.57791 33.8144 8.75832C33.8319 8.87519 33.855 9.07791 33.8967 9.12551H33.6702C33.6175 9.00269 33.6228 8.82887 33.5822 8.68331C33.5486 8.5726 33.4895 8.53222 33.3627 8.53222H33.1768V8.53286L33.1757 8.53244ZM33.413 8.3635C33.599 8.3635 33.6521 8.26448 33.6521 8.17714C33.6521 8.07387 33.599 7.99227 33.413 7.99227H33.1757V8.36393H33.413V8.3635ZM32.3145 8.4859C32.3145 7.84055 32.8268 7.4043 33.4069 7.4043C33.9887 7.4043 34.5004 7.84055 34.5004 8.4859C34.5004 9.12998 33.9889 9.56666 33.4069 9.56666C32.8268 9.56666 32.3145 9.12998 32.3145 8.4859Z"
                        fill="#FF5A00"
                      />
                      <path
                        d="M28.5281 9.37815L27.2686 7.96569L26.0202 9.37815H23.3934L25.9607 6.49373L23.3934 3.60846H26.1023L27.3745 5.01008L28.5987 3.60846H31.2128L28.6582 6.48161L31.2483 9.37815H28.5281ZM18.3491 9.37815V0.289062H23.3934V2.315H20.4858V3.60846H23.3934V5.5579H20.4858V7.34711H23.3934V9.37815H18.3491Z"
                        fill="#FF5A00"
                      />
                      <path
                        d="M16.2205 0.289062V4.0088H16.1969C15.7258 3.46736 15.1369 3.27867 14.4542 3.27867C13.0551 3.27867 12.0011 4.23044 11.6312 5.48778C11.2092 4.10209 10.121 3.25274 8.5077 3.25274C7.19724 3.25274 6.16281 3.84072 5.62243 4.79908V3.60825H2.91417V2.31521H5.86999V0.289488H0.5V9.37815H2.91417V5.5579H5.32047C5.24635 5.85167 5.2093 6.15357 5.21019 6.45654C5.21019 8.35158 6.65835 9.68329 8.50728 9.68329C10.0615 9.68329 11.0866 8.95295 11.6282 7.62336H9.55913C9.27949 8.02349 9.06699 8.14164 8.50749 8.14164C7.85895 8.14164 7.29924 7.57555 7.29924 6.90534H11.5122C11.6949 8.41087 12.8679 9.70901 14.4778 9.70901C15.1722 9.70901 15.808 9.36753 16.1967 8.7906H16.22V9.37943H18.3486V0.289488H16.2205V0.289062ZM7.36638 5.5851C7.50089 5.00754 7.94862 4.63014 8.50749 4.63014C9.12288 4.63014 9.54787 4.99585 9.65943 5.5851H7.36638ZM14.9287 7.99501C14.1444 7.99501 13.6569 7.26424 13.6569 6.50096C13.6569 5.68497 14.081 4.90107 14.9287 4.90107C15.8082 4.90107 16.1586 5.6854 16.1586 6.50096C16.1586 7.27402 15.7876 7.99501 14.9287 7.99501Z"
                        fill="#29007C"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_9701_52817">
                        <rect
                          width="34"
                          height="9.4248"
                          fill="white"
                          transform="translate(0.5 0.287109)"
                        />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <div>
                  <h4 className="text-text-50 text-base font-medium">
                    Fedex Shipping
                  </h4>
                  <p className="text-text-100 text-sm">
                    Take up to 3 working days
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
