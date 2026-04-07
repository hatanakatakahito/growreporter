import { Button } from '@/components/core/button';
import { MapMarker5, Wallet2 } from '@tailgrids/icons';

export default function OrderSummaries1() {
  return (
    <section className="bg-background-50">
      <div className="mx-auto max-w-[1440px] px-4 lg:px-0">
        <div className="flex flex-col items-center lg:flex-row lg:gap-0">
          <div className="px-4 pt-16 pb-11 lg:w-5/12 lg:px-10 lg:py-0 xl:px-20">
            <div>
              <div className="text-center">
                <div className="bg-background-success-600 ring-background-success-600/30 mb-8 inline-flex size-16 items-center justify-center rounded-full ring-8 sm:mb-12 lg:size-18 xl:mb-16">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="40"
                    height="40"
                    viewBox="0 0 40 40"
                    fill="none"
                  >
                    <path
                      d="M33.5039 10.9004L15.3039 29.1004L6.49561 20.2921"
                      stroke="white"
                      stroke-width="4"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-title-50 text-2xl font-semibold">
                  Thank You For Your Order!
                </h3>
                <p className="text-text-100">
                  Your order has been successfully placed. We’ve sent a
                  confirmation to your email.
                </p>
              </div>

              <div className="mt-12 hidden w-full flex-col gap-3 lg:flex xl:mt-24">
                <Button className="h-12"> Continue Shopping</Button>
                <Button className="h-12" appearance="outline">
                  <a href="javascript:void(0)">Back to home</a>
                </Button>
              </div>
            </div>
          </div>
          <div className="bg-background-soft-100 rounded-2xl p-4 lg:w-7/12 lg:rounded-none lg:px-10 lg:py-14 xl:px-20 xl:py-28">
            <div className="mb-6 lg:mb-14">
              <h3 className="text-title-50 mb-1 text-2xl font-semibold sm:text-3xl">
                Order Summary
              </h3>
              <p className="text-text-50 font-medium">
                Your Order ID:{' '}
                <span className="font-semibold">#ORDER-2789</span>
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
              <div className="bg-background-50 col-span-full rounded-2xl p-5 sm:p-6">
                <ul className="space-y-6">
                  <li className="flex gap-6">
                    <img
                      src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/order-summaries/order-summary-01/product-1.jpg"
                      className="size-17.5 shrink-0 rounded-lg"
                      alt=""
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
                  <li className="flex gap-6">
                    <img
                      src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/order-summaries/order-summary-01/product-2.jpg"
                      className="size-17.5 shrink-0 rounded-lg"
                      alt=""
                    />
                    <div className="flex-1 space-y-1">
                      <h3 className="text-title-50 text-sm font-medium">
                        Selvedge demin jeans
                      </h3>
                      <p className="text-text-100 text-xs">
                        jeans - 1x • Size M
                      </p>
                      <p className="text-text-50 mt-1 text-sm font-semibold">
                        $129.00
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-6">
                    <img
                      src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/order-summaries/order-summary-01/product-3.jpg"
                      className="size-17.5 shrink-0 rounded-lg"
                      alt=""
                    />
                    <div className="flex-1 space-y-1">
                      <h3 className="text-title-50 text-sm font-medium">
                        Italian Leather Belt
                      </h3>
                      <p className="text-text-100 text-xs">
                        Belt - 1x • Size M
                      </p>
                      <p className="text-text-50 mt-1 text-sm font-semibold">
                        $59.50
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="bg-background-50 col-span-full rounded-2xl p-5 sm:p-6">
                <ul className="border-base-50 border-b pb-5">
                  <li className="text-text-50 flex justify-between pb-2.5 text-base">
                    <span>Subtotal</span>
                    <span className="font-medium">$277.95</span>
                  </li>
                  <li className="text-text-50 flex justify-between py-2.5 text-base">
                    <span>Shipping</span>
                    <span className="font-medium">$4.99</span>
                  </li>
                  <li className="text-text-50 flex justify-between py-2.5 text-base">
                    <span>Taxes</span>
                    <span className="font-medium">$36.84</span>
                  </li>
                </ul>
                <div className="text-title-50 flex justify-between pt-5 font-semibold">
                  <span className="text-title-50 text-lg font-medium">
                    Total
                  </span>
                  <span className="text-title-50 text-lg font-medium">
                    $319.78
                  </span>
                </div>
              </div>
              <div className="bg-background-50 rounded-2xl p-5 sm:p-6">
                <div className="text-title-50 bg-background-soft-100 mb-8 inline-flex size-11 items-center justify-center rounded-lg">
                  <MapMarker5 />
                </div>
                <h4 className="text-title-50 mb-2 font-semibold">
                  Shipping Address
                </h4>
                <p className="text-text-50 text-sm">
                  Pimjo LLC - 30 N Gould St Ste R Sheridan, WY 82801, USA
                </p>
              </div>
              <div className="bg-background-50 rounded-2xl p-5 sm:p-6">
                <div className="text-title-50 bg-background-soft-100 mb-8 inline-flex size-11 items-center justify-center rounded-lg">
                  <Wallet2 />
                </div>
                <h4 className="text-title-50 mb-2 font-semibold">
                  Payment Info
                </h4>
                <p className="text-text-200 text-sm">
                  <svg
                    className="mr-1 inline-block"
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M1.25 10C1.25 5.16751 5.16751 1.25 10 1.25C14.8325 1.25 18.75 5.16751 18.75 10C18.75 14.8325 14.8325 18.75 10 18.75C5.16751 18.75 1.25 14.8325 1.25 10Z"
                      fill="#172A73"
                    />
                    <path
                      d="M3.48389 6.08984V6.46218L4.8451 6.6765C5.8096 6.82835 6.58695 7.55331 6.81168 8.51055L8.40513 15.2979C8.44457 15.4659 8.59342 15.5845 8.76473 15.5845H11.0008C11.1483 15.5845 11.2817 15.4961 11.3401 15.3597L15.1973 6.34975C15.2499 6.22686 15.1605 6.08984 15.0276 6.08984H12.9674C12.8187 6.08984 12.6844 6.17973 12.6268 6.31792L10.0429 12.5127L9.01214 7.00005C8.91343 6.47218 8.45583 6.08984 7.92274 6.08984H3.48389Z"
                      fill="white"
                    />
                  </svg>
                  Visa Ending 1345
                  <br />
                  Expire 04/26
                </p>
              </div>
            </div>
          </div>
          <div className="mt-11 flex w-full flex-col gap-3 lg:hidden">
            <Button>Continue Shopping</Button>
            <Button appearance="outline">
              <a href="javascript:void(0)">Back to home</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
