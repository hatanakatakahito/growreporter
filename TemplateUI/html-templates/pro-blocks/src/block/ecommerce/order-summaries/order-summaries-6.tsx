import { Button } from '@/components/core/button';

export default function OrderSummaries6() {
  return (
    <section className="bg-background-50 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-11 max-w-lg sm:mb-16">
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            Thank you ! Musharof
          </h2>
          <p className="text-text-100 text-center sm:px-5">
            Your Order has been placed successfully a confirmation mail sent to
            <span className="text-title-50"> hello@pimjo.com.</span>
          </p>
        </div>
        <div className="bg-background-soft-100 flex flex-col gap-3 rounded-2xl p-3 lg:flex-row">
          <div className="bg-background-50 rounded-xl p-5 sm:p-8 lg:w-1/2">
            <ul className="divide-base-100 divide-y">
              <li className="space-y-7 pb-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-title-50 text-xl font-semibold">
                    Order Info
                  </h3>

                  <Button appearance="outline">
                    <a href="javascript:void(0)">View Invoice</a>
                  </Button>
                </div>
                <p className="text-text-100 mb-2.5 text-base">
                  Order ID:
                  <span className="text-title-50 font-medium">#DF5445789</span>
                </p>
                <p className="text-text-100 mb-2.5 text-base">
                  Date :
                  <span className="text-title-50 font-medium">
                    25 June 2025
                  </span>
                </p>
              </li>
              <li className="space-y-3 py-8">
                <h3 className="text-title-50 mb-7 text-xl font-semibold">
                  Shipping Address
                </h3>
                <p className="text-text-100 text-base">Musharof Chowdhury </p>
                <address className="text-text-100 text-base not-italic">
                  Pimjo LLC - 30 N Gould St Ste <br />R Sheridan, WY 82801, USA
                </address>
                <p className="text-text-100 text-base not-italic">
                  +1 (555) 123-4567
                </p>
              </li>
              <li className="pt-8">
                <h3 className="text-title-50 mb-7 text-xl font-semibold">
                  Payment Method
                </h3>
                <div className="flex gap-3">
                  <div className="bg-background-soft-100 inline-flex size-12 items-center justify-center rounded-lg">
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
                    <h4 className="text-title-50 text-base font-medium">
                      Visa Ending 1345
                    </h4>
                    <p className="text-text-100 text-sm">Charged on June 12</p>
                  </div>
                </div>
              </li>
            </ul>
          </div>
          <div className="bg-background-50 rounded-xl p-5 sm:p-8 lg:w-1/2">
            <ul className="divide-base-50 divide-y">
              <li className="flex gap-6 py-6 first:pt-0 last:pb-0">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/order-summaries/order-summary-06/product-1.jpg"
                  className="size-17.5 shrink-0 rounded-lg"
                  alt="product-1"
                />
                <div className="flex-1 space-y-1">
                  <h3 className="text-title-50 text-sm font-medium">
                    Wool Cable Knit Sweater
                  </h3>
                  <p className="text-text-100 text-xs">
                    Charcoal - 1x • Size M
                  </p>
                  <p className="text-text-50 mt-1 text-sm font-semibold">
                    $89.00
                  </p>
                </div>
              </li>
              <li className="flex gap-6 py-6 first:pt-0 last:pb-0">
                <img
                  src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/order-summaries/order-summary-06/product-2.jpg"
                  className="size-17.5 shrink-0 rounded-lg"
                  alt=""
                />
                <div className="flex-1 space-y-1">
                  <h3 className="text-title-50 text-sm font-medium">
                    Selvedge demin jeans
                  </h3>
                  <p className="text-text-100 text-xs">jeans - 1x • Size M</p>
                  <p className="text-text-50 mt-1 text-sm font-semibold">
                    $129.00
                  </p>
                </div>
              </li>
              <li className="flex gap-6 py-6 first:pt-0 last:pb-0">
                <img
                  src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/order-summaries/order-summary-06/product-3.jpg"
                  className="size-17.5 shrink-0 rounded-lg"
                  alt=""
                />
                <div className="flex-1 space-y-1">
                  <h3 className="text-title-50 text-sm font-medium">
                    Italian Leather Belt
                  </h3>
                  <p className="text-text-100 text-xs">Belt - 1x • Size M</p>
                  <p className="text-text-50 mt-1 text-sm font-semibold">
                    $59.50
                  </p>
                </div>
              </li>
            </ul>
            <div className="border-base-100 mt-6 border-t pt-6">
              <ul className="border-base-100 border-b pb-5">
                <li className="text-text-50 flex justify-between pb-2.5 text-base">
                  <span>Subtotal</span>
                  <span className="font-medium">$277.95</span>
                </li>
                <li className="text-text-50 flex justify-between py-2.5 text-base">
                  <span>
                    Discount
                    <span className="bg-badge-success-background text-badge-success-text ml-2 inline-block rounded-full px-2 py-0.5 text-xs leading-4 font-medium uppercase">
                      SUMMER2025
                    </span>
                  </span>
                  <span className="font-medium">-$24.8(10%)</span>
                </li>
                <li className="text-text-50 flex justify-between py-2.5 text-base">
                  <span>Taxes</span>
                  <span className="font-medium">$12.25</span>
                </li>
              </ul>
              <div className="text-title-50 flex justify-between pt-5 font-semibold">
                <span className="text-title-50 text-lg font-medium">Total</span>
                <span className="text-title-50 text-lg font-medium">
                  $264.04
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
