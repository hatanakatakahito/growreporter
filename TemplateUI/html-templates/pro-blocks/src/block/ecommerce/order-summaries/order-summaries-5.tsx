import {
  Calendar,
  CalendarTime,
  TruckDeliveryCheckCircle,
} from '@tailgrids/icons';

export default function OrderSummaries5() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="hidden justify-between xl:flex">
          <div className="flex items-center justify-between gap-11">
            <h3 className="text-title-50 text-2xl font-semibold">
              Order ID: #A80542
            </h3>
            <p className="text-text-100 flex items-center gap-2 text-base">
              <Calendar />
              Placed on June 12, 2025
            </p>
            <p className="text-text-100 flex items-center gap-2 align-middle text-base">
              <TruckDeliveryCheckCircle />
              Delivered on June 15, 2025
            </p>
          </div>
          <div>
            <span className="bg-badge-success-background text-badge-success-text inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium">
              <span className="bg-badge-success-icon-color h-1.5 w-1.5 rounded-full"></span>
              Delivered
            </span>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-6 lg:flex-row xl:hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-title-50 text-xl font-semibold sm:text-2xl">
              Order ID: #A80542
            </h3>
            <span className="bg-badge-success-background text-badge-success-text inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium">
              <span className="bg-badge-success-icon-color h-1.5 w-1.5 rounded-full"></span>
              Delivered
            </span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-5">
            <p className="text-text-100 flex items-center gap-2 text-base">
              <CalendarTime className="size-5" />
              Placed on June 12, 2025
            </p>
            <p className="text-text-100 flex items-center gap-2 align-middle text-base">
              <TruckDeliveryCheckCircle className="size-5" />
              Delivered on June 15, 2025
            </p>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="overflow-hidden lg:col-span-2">
            <div className="border-base-50 overflow-x-auto rounded-lg border">
              <table className="w-full">
                <thead className="bg-base-50">
                  <tr>
                    <th className="text-title-50 px-6 py-4 text-left text-base font-medium">
                      Product
                    </th>
                    <th className="text-title-50 px-6 py-4 text-left text-base font-medium">
                      Details
                    </th>
                    <th className="text-title-50 px-6 py-4 text-left text-base font-medium">
                      Quantity
                    </th>
                    <th className="text-title-50 px-6 py-4 text-left text-base font-medium">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-base-50 divide-y">
                  <tr>
                    <td className="p-6 whitespace-nowrap">
                      <div className="flex gap-10">
                        <div className="shrink-0">
                          <img
                            src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/order-summaries/order-summary-05/product-1.jpg"
                            className="size-20 rounded-lg"
                            alt=""
                          />
                        </div>
                        <div>
                          <h3 className="text-title-50 text-base font-medium">
                            Premium Wireless Headphones
                          </h3>
                          <p className="text-text-100 mb-2 text-sm">
                            Color: Matte Black
                          </p>
                          <a
                            href="javascript:void(0)"
                            className="text-primary-500 text-sm font-medium"
                          >
                            Write a Review
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="text-title-50 p-6 text-base whitespace-nowrap">
                      1
                    </td>
                    <td className="textbase text-title-50 p-6 whitespace-nowrap">
                      $129.99
                    </td>
                  </tr>
                  <tr>
                    <td className="p-6 whitespace-nowrap">
                      <div className="flex gap-10">
                        <div className="shrink-0">
                          <img
                            src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/order-summaries/order-summary-05/product-2.jpg"
                            className="size-20 rounded-lg"
                            alt="product"
                          />
                        </div>
                        <div>
                          <h3 className="text-title-50 text-base font-medium">
                            Smartphone Protective Case
                          </h3>
                          <p className="text-text-100 mb-2 text-sm">
                            Model: iPhone 13 Pro
                          </p>
                          <a
                            href="javascript:void(0)"
                            className="text-primary-500 text-sm font-medium"
                          >
                            Write a Review
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="text-title-50 p-6 text-base whitespace-nowrap">
                      1
                    </td>
                    <td className="textbase text-title-50 p-6 whitespace-nowrap">
                      $24
                    </td>
                  </tr>
                  <tr>
                    <td className="p-6 whitespace-nowrap">
                      <div className="flex gap-10">
                        <div className="shrink-0">
                          <img
                            src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/order-summaries/order-summary-05/product-3.jpg"
                            className="size-20 rounded-lg"
                            alt="product"
                          />
                        </div>
                        <div>
                          <h3 className="text-title-50 text-base font-medium">
                            Type USB cable
                          </h3>
                          <p className="text-text-100 mb-2 text-sm">
                            Length: 6ft, Color: Navy Blue
                          </p>
                          <a
                            href="javascript:void(0)"
                            className="text-primary-500 text-sm font-medium"
                          >
                            Write a Review
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="text-title-50 p-6 text-base whitespace-nowrap">
                      1
                    </td>
                    <td className="textbase text-title-50 p-6 whitespace-nowrap">
                      $129.99
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-6 lg:col-span-1">
            <div className="border-base-50 overflow-hidden rounded-lg border">
              <div className="bg-background-soft-100 rounded-t-lg px-6 py-4">
                <h3 className="text-title-50 text-base font-medium">
                  Order Summery
                </h3>
              </div>
              <ul className="border-base-50 border-b px-6 py-5">
                <li className="text-text-50 flex justify-between pb-2.5 text-base">
                  <span>Subtotal(3 items)</span>
                  <span className="font-medium">$277.95</span>
                </li>
                <li className="text-text-50 flex justify-between py-2.5 text-base">
                  <span>Discount </span>
                  <span className="font-medium">$172.48</span>
                </li>
                <li className="text-text-50 flex justify-between py-2.5 text-base">
                  <span>Taxes</span>
                  <span className="font-medium">$12.25</span>
                </li>
              </ul>
              <div className="text-title-50 flex justify-between px-5 py-5 font-semibold">
                <span className="text-title-50 text-lg font-medium">Total</span>
                <span className="text-title-50 text-lg font-medium">
                  $264.04
                </span>
              </div>
            </div>
            <div className="border-base-50 overflow-hidden rounded-lg border">
              <div className="bg-base-50 rounded-t-lg px-6 py-4">
                <h3 className="text-title-50 font-medium">Shipping Address</h3>
              </div>
              <div className="space-y-3 px-6 py-5">
                <p className="text-text-100 text-base">Musharof Chowdhury </p>
                <address className="text-text-100 text-base not-italic">
                  Pimjo LLC - 30 N Gould St Ste <br />R Sheridan, WY 82801, USA
                </address>
                <p className="text-text-100 text-base not-italic">
                  +1 (555) 123-4567
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
