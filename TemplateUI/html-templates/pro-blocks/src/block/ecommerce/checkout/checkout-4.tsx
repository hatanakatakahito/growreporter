import { Button } from '@/components/core/button';
import { Checkbox } from '@/components/core/checkbox';
import { Input } from '@/components/core/input';
import { CreditCard } from '@tailgrids/icons';
import { useState } from 'react';

export default function Checkout4() {
  const [selectedShipping, setSelectedShipping] = useState('express');
  const [selectedPayment, setSelectedPayment] = useState('card');
  const [discount, setDiscount] = useState('');
  return (
    <section className="bg-background-soft-100 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-background-50 rounded-2xl p-8 shadow-sm">
              <p className="text-text-100 text-base">01</p>
              <h2 className="text-title-50 mb-7 text-3xl font-semibold">
                Personal Information
              </h2>
              <form action="#">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Input type="text" placeholder="First Name" />
                  </div>
                  <div>
                    <Input type="text" placeholder="Last Name" />
                  </div>
                  <div>
                    <Input type="text" placeholder="Email Address" />
                  </div>
                  <div>
                    <select className="focus:border-primary-300 bg-input-background focus:ring-primary-500/30 border-base-200 text-title-50 placeholder:text-input-placeholder-text h-11 w-full rounded-lg border px-4 py-2.5 text-sm ring-3 ring-transparent placeholder:text-sm focus:outline-0">
                      <option value="0">+995</option>
                      <option value="1">+880</option>
                      <option value="2">+110</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
            <div className="bg-background-50 rounded-2xl p-8 shadow-sm">
              <p className="text-text-100 text-base">02</p>
              <h2 className="text-title-50 mb-7 text-3xl font-semibold">
                Shipping details
              </h2>
              <form>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="relative col-span-full">
                    <Input type="text" placeholder="Full Address" />
                  </div>
                  <div className="relative col-span-full">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <Input type="text" placeholder="Full Address" />
                      </div>
                      <div>
                        <select className="focus:border-primary-300 focus:ring-primary-500/30 text-title-50 bg-background-50/5 border-base-200 placeholder:text-input-placeholder-text h-11 w-full rounded-lg border px-4 py-2.5 text-sm ring-3 ring-transparent placeholder:text-sm focus:outline-0">
                          <option value="">State</option>
                          <option value="">New York</option>
                          <option value="">Tokyo</option>
                        </select>
                      </div>
                      <div>
                        <select className="focus:border-primary-300 bg-input-background focus:ring-primary-500/30 text-title-50 border-base-200 placeholder:text-input-placeholder-text h-11 w-full rounded-lg border px-4 py-2.5 text-sm ring-3 ring-transparent focus:outline-0">
                          <option value="">Country</option>
                          <option value="">USA</option>
                          <option value="">UK</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-full flex items-center">
                    <Checkbox
                      type="checkbox"
                      id="checkbox1"
                      label="Save this information for next time"
                    />
                  </div>
                </div>
              </form>
              <div className="mt-10">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* <!-- Free Shipping --> */}
                  <div
                    onClick={() => setSelectedShipping('free')}
                    className={`ring-background-soft-400 w-full cursor-pointer rounded-xl border-2 p-4 ring-1 transition-all ${selectedShipping === 'free' ? 'border-primary-500 ring-transparent' : 'border-transparent'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`mr-3 flex h-5 w-5 items-center justify-center rounded-full border-[1.25px] ${selectedShipping === 'free' ? 'border-primary-500 bg-primary-500' : 'border-base-200 bg-transparent'}`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${selectedShipping === 'free' ? 'bg-background-50' : ''}`}
                          ></span>
                        </div>
                        <div>
                          <h4 className="text-title-50 text-base font-semibold">
                            Free Shipping
                          </h4>
                          <p className="text-text-100 text-xs">3-5 Days</p>
                        </div>
                      </div>
                      <span className="text-text-50 text-base font-medium">
                        $0.00
                      </span>
                    </div>
                  </div>

                  {/* <!-- Express Shipping --> */}
                  <div
                    onClick={() => setSelectedShipping('express')}
                    className={`ring-background-soft-400 w-full cursor-pointer rounded-xl border-2 p-4 ring-1 transition-all ${selectedShipping === 'express' ? 'border-primary-500 ring-transparent' : 'border-transparent'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`mr-3 flex h-5 w-5 items-center justify-center rounded-full border-[1.25px] ${selectedShipping === 'express' ? 'border-primary-500 bg-primary-500' : 'border-base-200 bg-transparent'}`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${selectedShipping === 'express' ? 'bg-background-50' : ''}`}
                          ></span>
                        </div>
                        <div>
                          <h4 className="text-title-50 text-base font-semibold">
                            Express Shipping
                          </h4>
                          <span className="text-text-100 text-xs">
                            Delivery , Tomorrow
                          </span>
                        </div>
                      </div>
                      <span className="text-text-50 text-base font-medium">
                        $4.99
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-background-50 rounded-2xl p-8 shadow-sm">
              <p className="text-text-100 text-base">03</p>
              <h2 className="text-title-50 mb-7 text-3xl font-semibold">
                Payment Method
              </h2>
              <div className="border-base-100 space-y-6 rounded-lg border p-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div
                    onClick={() => setSelectedPayment('card')}
                    className={`ring-background-soft-400 flex cursor-pointer items-center rounded-xl border-2 p-3 ring-1 transition-all ${selectedPayment === 'card' ? 'border-primary-500 ring-transparent' : 'border-transparent'}`}
                  >
                    <div className="border-base-100 inline-flex h-10 w-10 items-center justify-center rounded-md border">
                      <CreditCard className="size-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-title-50 text-base">
                        Credit or debit card
                      </h3>
                    </div>
                  </div>
                  <div
                    onClick={() => setSelectedPayment('paypal')}
                    className={`ring-background-soft-400 flex cursor-pointer items-center rounded-xl border-2 p-3 ring-1 transition-all ${selectedPayment === 'paypal' ? 'border-primary-500 ring-transparent' : 'border-transparent'}`}
                  >
                    <div className="border-base-100 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border">
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
                <div>
                  <span className="text-title-50 mb-3 block text-sm font-medium">
                    Card Information
                  </span>
                  <div className="border-base-100 relative overflow-hidden rounded-xl border">
                    <div className="border-base-100 border-b">
                      <Input
                        type="text"
                        placeholder="4645 75345 4546 1345"
                        className="placeholder:text-input-placeholder-text w-full border-0 bg-transparent px-4 py-2.5 text-sm focus:ring-0 focus:outline-none"
                      />
                      <div className="absolute top-2.5 right-3 flex gap-1">
                        <img
                          src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/checkout/checkout-01/payment-1.png"
                          className="h-5"
                          alt="Visa"
                        />
                        <img
                          src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/checkout/checkout-01/payment-2.png"
                          className="h-5"
                          alt="Mastercard"
                        />
                        <img
                          src=" https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/checkout/checkout-01/payment-3.png"
                          className="h-5"
                          alt="Amex"
                        />
                      </div>
                    </div>
                    <div className="divide-base-100 flex divide-x">
                      <div className="w-1/2">
                        <Input
                          type="text"
                          placeholder="MM/YY"
                          className="placeholder:text-input-placeholder-text w-full border-0 bg-transparent px-4 py-2.5 text-sm focus:ring-0 focus:outline-none"
                        />
                      </div>
                      <div className="w-1/2">
                        <Input
                          type="text"
                          placeholder="CVC"
                          className="placeholder:text-input-placeholder-text w-full border-0 bg-transparent px-4 py-2.5 text-sm focus:ring-0 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-background-50 rounded-2xl p-8 shadow-sm">
              <h2 className="text-title-50 mb-7 text-3xl font-semibold">
                Order Summery
              </h2>
              {/* <!-- List --> */}
              <ul>
                <li className="flex items-start gap-6">
                  <div className="shrink-0">
                    <img
                      src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/checkout/checkout-04/prduct-1.jpg"
                      className="h-[70px] w-[70px] shrink-0 rounded-md object-cover"
                      alt="product"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-title-50 text-sm font-medium">
                      Selvedge demin jeans
                    </h3>
                    <p className="text-text-50 text-xs">jeans - 1x • Size M</p>
                    <p className="text-text-50 mt-1 text-sm font-semibold">
                      $129.00
                    </p>
                  </div>
                </li>
              </ul>
              {/* <!-- Discount Code --> */}
              <div className="my-8 space-y-2">
                <label className="text-text-50 mb-1.5 block text-sm font-medium">
                  Discount Code
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Enter your coupon code"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                    />
                  </div>
                  <Button className="px-5">Apply</Button>
                </div>
              </div>
              {/* <!-- Summary --> */}
              <div>
                <ul className="border-base-100 space-y-3 border-b pb-5">
                  <li className="text-text-50 flex justify-between text-base">
                    <span>Subtotal</span>
                    <span>$1200</span>
                  </li>
                  <li className="text-text-50 flex justify-between text-base">
                    <span>Taxes</span>
                    <span>$100</span>
                  </li>
                  <li className="text-text-50 flex justify-between text-base">
                    <span>Shipping</span>
                    <span>Free</span>
                  </li>
                  <li className="text-text-50 flex justify-between text-base">
                    <span>Discount</span>
                    <span>- $100</span>
                  </li>
                </ul>
                <div className="text-title-50 flex justify-between pt-5 font-semibold">
                  <span className="text-title-50 text-lg font-medium">
                    Total payable
                  </span>
                  <span className="text-title-50 text-lg font-medium">
                    $144.25
                  </span>
                </div>
              </div>
              {/* <!-- Button --> */}
              <div className="mt-8">
                <Button>Process to checkout</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
