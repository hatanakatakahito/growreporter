import { Button } from '@/components/core/button';
import { Checkbox } from '@/components/core/checkbox';
import { Input } from '@/components/core/input';
import {
  ChevronLeft,
  CreditCard,
  RefreshCircle3Clockwise,
  Shield1Check,
} from '@tailgrids/icons';
import { useState } from 'react';

export default function Checkout3() {
  const [selected, setSelected] = useState('express');
  const [selectedCard, setSelectedCard] = useState('card');
  return (
    <section className="bg-background-50">
      <div className="mx-auto max-w-[1440px] px-4 xl:px-0">
        <div className="flex flex-col lg:flex-row">
          <div className="bg-background-soft-400 space-y-8 px-5 pt-14 pb-28 md:px-10 lg:w-4/6 lg:px-16">
            <a
              href="javascript:void(0)"
              className="text-title-50 hover:bg-background-50 mb-9 inline-flex items-center gap-2 rounded-lg px-3 py-2 transition"
            >
              <ChevronLeft />
              Go Back
            </a>
            <div className="space-y-5">
              <div>
                <h3 className="text-title-50 mb-5 text-2xl font-semibold">
                  Order Summery
                </h3>
                <div className="bg-background-50 rounded-xl p-6">
                  <ul className="space-y-6">
                    {/* <!-- Item 1 --> */}
                    <li className="flex items-start gap-6">
                      <div>
                        <img
                          src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/checkout/checkout-03/product-1.jpg"
                          className="h-[70px] w-[70px] shrink-0 rounded-md object-cover"
                          alt="product"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-title-50 text-sm font-medium">
                          Wool Cable Knit Sweater
                        </h3>
                        <p className="text-text-50 text-xs">
                          Charcoal - 1x • Size M
                        </p>
                        <p className="text-text-50 mt-1 text-sm font-semibold">
                          $89.95
                        </p>
                      </div>
                    </li>
                    {/* <!-- Item 2 --> */}
                    <li className="flex items-start gap-6">
                      <div>
                        <img
                          src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/checkout/checkout-03/product-2.jpg"
                          className="h-[70px] w-[70px] shrink-0 rounded-md object-cover"
                          alt=""
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-title-50 text-sm font-medium">
                          Selvedge demin jeans
                        </h3>
                        <p className="text-text-50 text-xs">
                          jeans - 1x •Size M
                        </p>
                        <p className="text-text-50 mt-1 text-sm font-semibold">
                          $129.00
                        </p>
                      </div>
                    </li>
                    {/* <!-- Item 3 --> */}
                    <li className="flex items-start gap-6">
                      <div>
                        <img
                          src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/checkout/checkout-03/product-3.jpg"
                          className="h-[70px] w-[70px] shrink-0 rounded-md object-cover"
                          alt=""
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-title-50 text-sm font-medium">
                          Italian Leather Belt
                        </h3>
                        <p className="text-text-50 text-xs">
                          Belt - 1x • Size M
                        </p>
                        <p className="text-text-50 mt-1 text-sm font-semibold">
                          $59.50
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
              {/* <!-- Summary --> */}
              <div className="bg-background-50 rounded-xl p-6">
                <ul className="border-base-50 space-y-3 border-b pb-5">
                  <li className="text-text-50 flex justify-between text-base">
                    <span>Subtotal</span>
                    <span className="font-medium">$277.95</span>
                  </li>
                  <li className="text-text-50 flex justify-between text-base">
                    <span> Shipping</span>
                    <span className="font-medium">$4.99</span>
                  </li>
                  <li className="text-text-50 flex justify-between text-base">
                    <span>Taxes</span>
                    <span className="font-medium">$36.84</span>
                  </li>
                </ul>
                <div className="text-title-50 flex justify-between pt-5 font-semibold">
                  <span className="text-title-50 text-lg font-medium">
                    Total payable
                  </span>
                  <span className="text-title-50 text-lg font-medium">
                    $319.78
                  </span>
                </div>
              </div>
              {/* <!-- Footer  --> */}
              <div className="flex flex-col justify-center gap-5 pt-5 sm:flex-row">
                <div className="bg-background-soft-100 flex items-center gap-2 rounded-full px-4 py-2">
                  <Shield1Check className="text-text-50 size-5 shrink-0" />
                  <p className="text-text-50 text-xs font-medium">
                    SSL Encrypted - 100% sucered
                  </p>
                </div>
                <div className="bg-background-soft-100 flex items-center gap-2 rounded-full px-4 py-2">
                  <RefreshCircle3Clockwise className="text-text-50 size-5 shrink-0" />
                  <p className="text-text-50 text-xs font-medium">
                    30-Day Returns
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-background-50 px-5 py-10 md:px-10 lg:w-5/6 lg:px-28 lg:py-28">
            <h3 className="text-title-50 mb-5 text-2xl font-semibold">
              Fill up this information
            </h3>
            <form>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="relative col-span-full">
                  <Input type="text" placeholder="Full Name" />
                </div>
                <div className="relative">
                  <Input type="text" placeholder="Email Address" />
                </div>
                <div className="relative">
                  <select className="focus:border-primary-300 bg-input-background focus:ring-primary-500/30 text-title-50 border-base-200 placeholder:text-input-placeholder-text h-11 w-full rounded-lg border px-4 py-2.5 text-sm ring-3 ring-transparent placeholder:text-sm focus:outline-0">
                    <option value="1">+995</option>
                    <option value="2">+880</option>
                    <option value="3">+110</option>
                  </select>
                </div>
                <div className="relative col-span-full">
                  <Input type="text" placeholder="Full Address" />
                </div>
                <div className="relative col-span-full">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <Input type="text" placeholder="Zip Code" />
                    </div>
                    <div>
                      <select className="focus:border-primary-300 bg-input-background focus:ring-primary-500/30 text-title-50 border-base-200 placeholder:placeholder:text-input-placeholder-text h-11 w-full rounded-lg border px-4 py-2.5 text-sm ring-3 ring-transparent placeholder:text-sm focus:outline-0">
                        <option value="1">State</option>
                        <option value="2">New York</option>
                        <option value="3">Tokyo</option>
                      </select>
                    </div>
                    <div>
                      <select className="focus:border-primary-300 bg-input-background focus:ring-primary-500/30 text-title-50 border-base-200 placeholder:placeholder:text-input-placeholder-text h-11 w-full rounded-lg border px-4 py-2.5 text-sm ring-3 ring-transparent placeholder:text-sm focus:outline-0">
                        <option value="1">Country</option>
                        <option value="2">USA</option>
                        <option value="3">UK</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="col-span-full flex items-center">
                  <Checkbox
                    type="checkbox"
                    id="checkbox1"
                    label=" Save this information for next time"
                  />
                </div>
              </div>
            </form>

            <div className="mt-10">
              <h2 className="mb-4 text-lg font-semibold">Shipping method</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Free Shipping */}
                <div
                  onClick={() => setSelected('free')}
                  className={`ring-background-soft-400 w-full cursor-pointer rounded-xl p-5 ring-1 transition-all ${
                    selected === 'free'
                      ? 'border-primary-500 border-2 ring-transparent'
                      : 'border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`mr-3 flex h-5 w-5 items-center justify-center rounded-full border-[1.25px] ${
                          selected === 'free'
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-base-200 bg-transparent'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            selected === 'free' ? 'bg-background-50' : ''
                          }`}
                        ></span>
                      </div>
                      <div>
                        <h4 className="text-title-50 text-base font-semibold">
                          Free Shipping
                        </h4>
                        <p className="text-text-100 text-xs">3-5 Days</p>
                      </div>
                    </div>
                    <span className="text-text-50 text-sm font-normal">
                      3-5 Days
                    </span>
                  </div>
                </div>

                {/* Express Shipping */}
                <div
                  onClick={() => setSelected('express')}
                  className={`ring-background-soft-400 w-full cursor-pointer rounded-xl p-5 ring-1 transition-all ${
                    selected === 'express'
                      ? 'border-primary-500 border-2 ring-transparent'
                      : 'border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`mr-3 flex h-5 w-5 items-center justify-center rounded-full border-[1.25px] ${
                          selected === 'express'
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-base-200 bg-transparent'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            selected === 'express' ? 'bg-background-50' : ''
                          }`}
                        ></span>
                      </div>
                      <div>
                        <h4 className="text-title-50 text-base font-semibold">
                          Express Shipping
                        </h4>
                        <span className="text-text-100 text-xs">
                          Delivery, Tomorrow
                        </span>
                      </div>
                    </div>
                    <span className="text-text-50 text-sm font-normal">
                      $4.99
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <h2 className="text-title-50 mb-5 text-2xl font-semibold">
                Payment Method
              </h2>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Credit/Debit Card */}
                <div
                  onClick={() => setSelectedCard('card')}
                  className={`ring-background-soft-400 flex cursor-pointer items-center rounded-xl border-2 p-3.5 ring-1 transition-all ${
                    selectedCard === 'card'
                      ? 'border-primary-500 ring-transparent'
                      : 'border-transparent'
                  }`}
                >
                  <div className="border-base-100 inline-flex h-10 w-10 items-center justify-center rounded-lg border">
                    <CreditCard className="size-6" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-title-50 text-base">
                      Credit or debit card
                    </h3>
                  </div>
                </div>

                {/* PayPal */}
                <div
                  onClick={() => setSelectedCard('paypal')}
                  className={`ring-background-soft-400 flex cursor-pointer items-center rounded-xl border-2 p-3.5 ring-1 transition-all ${
                    selectedCard === 'paypal'
                      ? 'border-primary-500 ring-transparent'
                      : 'border-transparent'
                  }`}
                >
                  <div className="border-base-100 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="17"
                      height="20"
                      viewBox="0 0 17 20"
                      fill="none"
                    >
                      <path
                        d="M15.3864 5.21293C15.6201 3.68888 15.3864 2.67285 14.5682 1.73497C13.6722 0.67986 12.0359 0.25 9.93218 0.25H3.89363C3.46509 0.25 3.11446 0.562625 3.03654 0.992485L0.504248 17.0145C0.46529 17.3272 0.69904 17.6007 1.01071 17.6007H4.75072L4.47801 19.242C4.43905 19.5155 4.63384 19.75 4.94551 19.75H8.10114C8.49072 19.75 8.80239 19.4765 8.84135 19.1247L9.50364 14.9825C9.5426 14.6308 9.89323 14.3572 10.2439 14.3572H10.7114C13.7501 14.3572 16.1655 13.1067 16.8668 9.51152C17.1395 8.02655 17.0226 6.73697 16.2434 5.87725C16.0097 5.60371 15.737 5.40832 15.3864 5.21293"
                        fill="#009CDE"
                      />
                      <path
                        d="M15.3864 5.21293C15.6201 3.68888 15.3864 2.67285 14.5682 1.73497C13.6722 0.67986 12.0359 0.25 9.93218 0.25H3.89363C3.46509 0.25 3.11446 0.562625 3.03654 0.992485L0.504248 17.0145C0.46529 17.3272 0.69904 17.6007 1.01071 17.6007H4.75071L5.64676 11.8171C5.72468 11.3873 6.0753 11.0746 6.50384 11.0746H8.29593C11.8022 11.0746 14.5293 9.66783 15.3084 5.52555C15.3474 5.44739 15.3474 5.33016 15.3864 5.21293Z"
                        fill="#012169"
                      />
                      <path
                        d="M6.69864 5.252C6.73759 4.97846 7.08822 4.62675 7.43884 4.62675H12.1918C12.7372 4.62675 13.2826 4.66583 13.7501 4.74399C14.1786 4.82214 14.9578 5.01753 15.3474 5.252C15.5812 3.72796 15.3474 2.71192 14.5293 1.77405C13.6722 0.67986 12.0359 0.25 9.93218 0.25H3.89363C3.46509 0.25 3.11446 0.562625 3.03654 0.992485L0.504248 17.0145C0.46529 17.3272 0.69904 17.6007 1.01071 17.6007H4.75071L6.69864 5.252V5.252Z"
                        fill="#003087"
                      />
                    </svg>
                  </div>
                  <div className="ml-4 shrink-0">
                    <h3 className="text-title-50 text-base">
                      MasterCard Last 5664
                    </h3>
                    <p className="text-text-100 text-xs">Expire 05/2028</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="col-span-2">
                <label className="text-text-50 mb-2 block text-sm font-medium">
                  Card Number
                </label>
                <Input type="text" placeholder="4645 75345 4546 1345" />
              </div>
              <div>
                <label className="text-text-50 mb-2 block text-sm font-medium">
                  Expire date
                </label>
                <Input type="text" placeholder="04/2026" />
              </div>
              <div>
                <label className="text-text-50 mb-2 block text-sm font-medium">
                  CVC/CVV
                </label>
                <Input type="text" placeholder="324" />
              </div>
            </div>
            {/* <!-- Button --> */}
            <div className="mt-10 block">
              <Button className="h-12 w-full">Process to checkout</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
