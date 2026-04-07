import { Button } from '@/components/core/button';
import { Download1 } from '@tailgrids/icons';

export default function OrderSummaries4() {
  return (
    <section className="bg-background-50 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto max-w-4xl px-2">
          <div className="mb-11 max-w-lg sm:mb-16">
            <h2 className="text-title-50 mb-4 text-left text-4xl font-semibold sm:text-5xl">
              Thanks For Ordering
            </h2>
            <p className="text-text-100 text-left">
              Your order has been confirmed and will shipping soon. A
              confirmation email has been sent to your email.
            </p>
          </div>

          <div>
            <div className="border-base-50 flex flex-col flex-wrap justify-between gap-3 border-b py-6 sm:flex-row sm:gap-11 lg:flex-nowrap lg:items-center">
              <div className="flex">
                <span className="text-text-100 font-normal">Order ID:</span>
                <span className="text-title-50 ml-1 inline-block font-semibold">
                  TGA80456542
                </span>
              </div>
              <div className="flex">
                <span className="text-text-100 font-normal">Order Date:</span>
                <span className="text-title-50 ml-1 inline-block font-semibold">
                  12 June 2025
                </span>
              </div>
              <div className="flex">
                <span className="text-text-100 font-normal">Order status:</span>
                <span className="text-title-50 ml-1 inline-block font-semibold">
                  Delivered
                </span>
              </div>
              <div>
                <Button appearance="outline">
                  Download Invoice <Download1 />
                </Button>
              </div>
            </div>

            <ul className="divide-base-50 divide-y">
              <li className="flex flex-col justify-between gap-6 py-6 sm:flex-row sm:items-center">
                <div className="flex grow flex-col gap-4 sm:flex-row sm:items-center">
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/order-summaries/order-summary-04/product-1.jpg"
                    className="border-base-100 h-18 w-18 shrink-0 rounded-lg sm:w-auto"
                    alt="product"
                  />
                  <div className="grow">
                    <h3 className="text-title-50 text-base font-medium">
                      Nike Airforc 1
                    </h3>
                    <p className="text-text-100 mb-1 inline-flex items-center gap-1 text-xs font-normal">
                      Color - 1x
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="3"
                        height="4"
                        viewBox="0 0 3 4"
                        fill="none"
                      >
                        <circle cx="1.5" cy="2" r="1.5" fill="#D1D5DB" />
                      </svg>
                      Size 7
                    </p>
                    <h4 className="text-title-50 text-sm font-semibold">
                      $700
                    </h4>
                  </div>
                </div>

                <div className="divide-base-100 divide-x">
                  <a
                    href="javascript:void(0)"
                    className="hover:text-title-50 text-text-100 inline-flex pr-8 text-sm font-medium transition-colors"
                  >
                    View Order
                  </a>
                  <a
                    href="javascript:void(0)"
                    className="hover:text-title-50 text-text-100 inline-flex pl-8 text-sm font-medium transition-colors"
                  >
                    Similar Product
                  </a>
                </div>
              </li>
              <li className="flex flex-col justify-between gap-6 py-6 sm:flex-row sm:items-center">
                <div className="flex grow flex-col gap-4 sm:flex-row sm:items-center">
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/order-summaries/order-summary-04/product-2.jpg"
                    className="border-base-100 h-18 w-18 rounded-lg sm:w-auto"
                    alt="product"
                  />
                  <div className="grow">
                    <h3 className="text-title-50 text-base font-medium">
                      Nike Runner 250
                    </h3>
                    <p className="text-text-100 mb-1 inline-flex items-center gap-1 text-xs font-normal">
                      Red - 1x
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="3"
                        height="4"
                        viewBox="0 0 3 4"
                        fill="none"
                      >
                        <circle cx="1.5" cy="2" r="1.5" fill="#D1D5DB" />
                      </svg>
                      Nike Runner 250
                    </p>
                    <h4 className="text-title-50 text-sm font-semibold">
                      $500
                    </h4>
                  </div>
                </div>

                <div className="divide-base-100 divide-x">
                  <a
                    href="javascript:void(0)"
                    className="hover:text-title-50 text-text-100 inline-flex pr-8 text-sm font-medium transition-colors"
                  >
                    View Order
                  </a>
                  <a
                    href="javascript:void(0)"
                    className="hover:text-title-50 text-text-100 inline-flex pl-8 text-sm font-medium transition-colors"
                  >
                    Similar Product
                  </a>
                </div>
              </li>
            </ul>

            <div className="mt-6">
              <ul className="pb-5">
                <li className="flex items-center justify-between py-2.5">
                  <span className="text-text-50 text-base font-normal">
                    Subtotal(3 items)
                  </span>
                  <span className="text-text-50 text-base font-medium">
                    $1200
                  </span>
                </li>

                <li className="flex items-center justify-between py-2.5">
                  <span className="text-text-50 text-base font-normal">
                    Shipping
                  </span>
                  <span className="text-text-50 text-base font-medium">
                    $15.25
                  </span>
                </li>
                <li className="flex items-center justify-between py-2.5">
                  <span className="text-text-50 text-base font-normal">
                    Tax
                  </span>
                  <span className="text-text-50 text-base font-medium">
                    $14
                  </span>
                </li>
                <li className="flex items-center justify-between py-2.5">
                  <span className="text-text-50 text-base font-normal">
                    Discount
                  </span>
                  <span className="text-text-50 text-base font-medium">
                    Free
                  </span>
                </li>
              </ul>
              <div className="border-base-100 flex justify-between border-t pt-5">
                <span className="text-title-50 text-lg font-semibold">
                  Total
                </span>
                <span className="text-title-50 text-xl font-bold">
                  $1229.25
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
