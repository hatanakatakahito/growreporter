import { Button } from '@/components/core/button';

export default function OrderSummaries3() {
  return (
    <section className="bg-background-soft-100 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-11 max-w-xl sm:mb-16">
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            Your Order is Confirmed
          </h2>
          <p className="text-text-100 text-center sm:px-14">
            Your Product Code has been sent to
            <span className="text-title-50"> hello@pimjo.com </span>
            Kindly check your email please.
          </p>
        </div>
        <div className="mx-auto max-w-2xl px-1.5">
          <div className="bg-background-50 space-y-12 rounded-3xl p-5 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">
                <span className="text-title-50">Order ID: #DF55789</span>
              </p>

              <Button appearance="outline">
                <a href="javascript:void(0)">View Invoice</a>
              </Button>
            </div>
            <ul className="divide-base-50 divide-y">
              <li className="flex flex-col gap-5 pb-4 sm:flex-row sm:items-center">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/order-summaries/order-summary-03/product-1.png"
                  className="border-base-100 w-full shrink-0 rounded-lg sm:w-auto"
                  alt="product-1"
                />
                <div className="flex-1">
                  <h3 className="text-title-50 mb-1 text-base font-medium">
                    Tailadmin V2.0
                  </h3>
                  <p className="text-text-100 mb-1 text-xs font-normal">
                    Business Pack - 1x
                  </p>
                  <h4 className="text-title-50 text-sm font-semibold">
                    $239.00
                  </h4>
                </div>
              </li>
              <li className="flex flex-col gap-5 pt-4 sm:flex-row sm:items-center">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/order-summaries/order-summary-03/product-2.png"
                  className="border-base-100 w-full shrink-0 rounded-lg sm:w-auto"
                  alt="product-2"
                />

                <div className="grow">
                  <h3 className="text-title-50 mb-1 text-base font-medium">
                    Static.Run
                  </h3>
                  <p className="text-text-100 mb-1 text-xs font-normal">
                    Medium Pack - 1x
                  </p>
                  <h4 className="text-title-50 text-sm font-semibold">$9.00</h4>
                </div>
              </li>
            </ul>
            <div>
              <ul className="pb-5">
                <li className="flex items-center justify-between py-2.5">
                  <span className="text-text-100 text-base font-normal">
                    Subtotal
                  </span>
                  <span className="text-text-100 text-base font-medium">
                    $248.00
                  </span>
                </li>
                <li className="flex items-center justify-between py-2.5">
                  <span className="text-text-100 text-base font-normal">
                    Discount
                    <span className="bg-badge-success-background text-badge-success-text ml-2 inline-block rounded-full px-2 py-0.5 text-xs leading-4 font-medium">
                      SUMMER2025
                    </span>
                  </span>
                  <span className="text-text-100 text-base font-medium">
                    -$24.8(10%)
                  </span>
                </li>
                <li className="flex items-center justify-between py-2.5">
                  <span className="text-text-100 text-base font-normal">
                    Tax
                  </span>
                  <span className="text-text-100 text-base font-medium">
                    $12.25
                  </span>
                </li>
              </ul>
              <div className="border-base-100 flex justify-between border-t pt-5">
                <span className="text-title-50 text-lg font-medium">Total</span>
                <span className="text-title-50 text-xl font-semibold">
                  $235.45
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
