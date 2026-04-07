import { Button } from '@/components/core/button';
import { Checkbox } from '@/components/core/checkbox';
import { Input } from '@/components/core/input';
import { TextArea } from '@/components/core/text-area';
import { Bank1, CreditCard } from '@tailgrids/icons';
import { useState } from 'react';

export default function Checkout1() {
  const [method, setMethod] = useState('card');
  return (
    <section className="bg-background-soft-100 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="bg-background-50 rounded-xl p-5 sm:p-10 lg:w-1/2">
            <nav className="mb-8">
              <ul className="flex space-x-1 text-base">
                <li className="text-text-200">Home</li>
                <li className="text-text-200">/</li>
                <li className="text-text-200">Cart</li>
                <li className="text-text-200">/</li>
                <li className="text-title-50">Checkout</li>
              </ul>
            </nav>
            <div className="space-y-8">
              <form>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="relative">
                    <label
                      htmlFor="full-name"
                      className="text-text-50 mb-2 block text-sm font-medium"
                    >
                      Full Name
                    </label>
                    <Input type="text" placeholder="David Watson" />
                  </div>
                  <div className="relative">
                    <label
                      htmlFor="email"
                      className="text-text-50 mb-2 block text-sm font-medium"
                    >
                      Email
                    </label>
                    <Input type="text" placeholder="hello@pimjo.com" />
                  </div>
                  <div className="relative col-span-full">
                    <label
                      htmlFor="full-name"
                      className="text-text-50 mb-2 block text-sm font-medium"
                    >
                      Address
                    </label>
                    <Input
                      type="text"
                      placeholder="30 N Gould St Ste R Sheridan, WY 82801"
                    />
                  </div>
                  <div className="relative col-span-full">
                    <label
                      htmlFor="message"
                      className="text-text-50 mb-2 block text-sm font-medium"
                    >
                      Additional Information
                    </label>
                    <TextArea
                      rows={5}
                      placeholder="Enter your message here..."
                    ></TextArea>
                  </div>
                  <div className="col-span-full flex items-center">
                    <Checkbox
                      type="checkbox"
                      id="checkbox1"
                      label=" Billing Address Same As Shipping"
                    />
                  </div>
                </div>
              </form>

              <div>
                <h2 className="text-title-50 mb-4 text-xl font-semibold">
                  Select payment
                </h2>
                {/* Payment Method Tabs */}
                <div className="mb-3 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => setMethod('card')}
                    className={`text-title-50 flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-base sm:w-1/2 ${
                      method === 'card'
                        ? 'border-primary-500 border-2'
                        : 'border-base-100'
                    }`}
                  >
                    <div className="border-base-100 flex h-10 w-10 items-center justify-center rounded-lg border">
                      <CreditCard className="size-6" />
                    </div>
                    Credit or debit card
                  </button>

                  <button
                    onClick={() => setMethod('bank')}
                    className={`text-title-50 flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-base sm:w-1/2 ${
                      method === 'bank'
                        ? 'border-2 border-blue-500'
                        : 'border-base-100'
                    }`}
                  >
                    <div className="border-base-100 flex h-10 w-10 items-center justify-center rounded-lg border">
                      <Bank1 className="size-6" />
                    </div>
                    Bank Transfer
                  </button>
                </div>

                {/* Credit Card Form */}
                {method === 'card' && (
                  <div>
                    <label className="text-title-50 mb-3 block text-sm font-medium">
                      Card Information
                    </label>
                    <div className="border-base-100 relative overflow-hidden rounded-lg border">
                      <div className="border-base-100 border-b">
                        <Input
                          type="text"
                          placeholder="4645 75345 4546 1345"
                          className="w-full border-0 bg-transparent px-4 py-2.5 text-sm focus:ring-0 focus:outline-none"
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
                            className="w-full border-0 bg-transparent px-4 py-2.5 text-sm focus:ring-0 focus:outline-none"
                          />
                        </div>
                        <div className="w-1/2">
                          <Input
                            type="text"
                            placeholder="CVC"
                            className="w-full border-0 bg-transparent px-4 py-2.5 text-sm focus:ring-0 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Transfer Info */}
                {method === 'bank' && (
                  <div className="text-text-100 mt-4 text-sm">
                    Bank transfer instructions will be sent after checkout.
                  </div>
                )}
              </div>

              <div className="my-4 flex items-center">
                <div className="bg-background-soft-200 h-px grow"></div>
                <p className="text-text-100 mx-4 text-sm">or pay with</p>
                <div className="bg-background-soft-200 h-px grow"></div>
              </div>
            </div>
            <div className="mt-5">
              <button className="bg-background-soft-100 flex h-15 w-full items-center justify-center rounded-lg p-5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={84}
                  height={20}
                  viewBox="0 0 84 20"
                  fill="none"
                >
                  <g
                    clipPath="url(#clip0_9489_2679)"
                    fillRule="evenodd"
                    clipRule="evenodd"
                  >
                    <path
                      d="M7.927 4.708h5.641c3.029 0 4.169 1.533 3.993 3.785-.291 3.72-2.54 5.777-5.522 5.777h-1.506c-.409 0-.684.27-.795 1.005L9.1 19.54c-.042.277-.188.437-.406.459H5.149c-.334 0-.452-.255-.364-.807l2.16-13.677c.085-.548.385-.808.982-.808z"
                      fill="#009EE3"
                    />
                    <path
                      d="M32.418 4.454c1.903 0 3.66 1.033 3.419 3.605-.291 3.058-1.93 4.75-4.514 4.758h-2.259c-.324 0-.482.265-.566.808l-.437 2.777c-.065.419-.28.626-.598.626H25.36c-.334 0-.45-.214-.377-.693l1.735-11.13c.085-.547.29-.75.665-.75h5.034zm-3.422 5.959h1.711c1.07-.041 1.78-.782 1.852-2.12.044-.825-.514-1.416-1.4-1.412l-1.611.008-.552 3.524zm12.553 5.763c.193-.175.388-.265.36-.05l-.068.516c-.035.27.07.412.321.412h1.867c.315 0 .468-.127.545-.613l1.15-7.22c.058-.362-.03-.54-.306-.54h-2.053c-.185 0-.275.104-.323.386l-.076.444c-.04.232-.145.273-.244.04-.349-.825-1.237-1.194-2.476-1.165-2.879.06-4.82 2.245-5.028 5.047-.16 2.166 1.392 3.869 3.44 3.869 1.485 0 2.149-.437 2.897-1.122l-.006-.004zm-1.563-1.111c-1.24 0-2.103-.989-1.924-2.2.179-1.212 1.338-2.2 2.577-2.2 1.24 0 2.103.988 1.924 2.2-.18 1.211-1.337 2.2-2.578 2.2zm9.392-6.407h-1.893c-.39 0-.55.291-.426.65l2.35 6.881-2.304 3.275c-.194.274-.044.523.228.523h2.128a.651.651 0 00.632-.31L57.32 9.309c.223-.319.118-.654-.248-.654H55.06c-.345 0-.483.137-.681.424l-3.014 4.368-1.347-4.378c-.079-.265-.275-.411-.638-.411h-.001z"
                      fill="#113984"
                    />
                    <path
                      d="M64.84 4.454c1.903 0 3.66 1.032 3.42 3.605-.292 3.058-1.93 4.75-4.515 4.758h-2.257c-.324 0-.482.265-.566.808l-.437 2.777c-.066.419-.281.626-.599.626h-2.1c-.336 0-.452-.214-.378-.693l1.737-11.132c.086-.548.292-.752.666-.752h5.03v.003zm-3.422 5.959h1.711c1.07-.041 1.781-.782 1.853-2.12.043-.825-.514-1.416-1.401-1.412l-1.61.008-.553 3.524zm12.554 5.763c.192-.175.387-.265.36-.05l-.069.516c-.035.27.071.412.322.412h1.867c.314 0 .467-.127.544-.613l1.15-7.22c.059-.362-.03-.54-.305-.54h-2.05c-.185 0-.276.104-.324.386l-.076.444c-.039.232-.145.273-.244.04-.348-.825-1.236-1.194-2.476-1.165-2.878.06-4.82 2.245-5.028 5.047-.16 2.166 1.392 3.869 3.44 3.869 1.485 0 2.149-.437 2.898-1.122l-.01-.004zm-1.563-1.111c-1.239 0-2.102-.989-1.923-2.2.179-1.212 1.338-2.2 2.577-2.2 1.24 0 2.103.988 1.924 2.2-.18 1.211-1.338 2.2-2.578 2.2zm8.61 2h-2.155a.257.257 0 01-.255-.18.255.255 0 01-.008-.11l1.893-11.993a.372.372 0 01.358-.292h2.155a.255.255 0 01.264.292l-1.893 11.992a.372.372 0 01-.359.295v-.003z"
                      fill="#009EE3"
                    />
                    <path
                      d="M4.4 0h5.646c1.59 0 3.477.051 4.738 1.165.843.744 1.286 1.928 1.184 3.203-.346 4.312-2.925 6.728-6.385 6.728H6.799c-.475 0-.788.314-.922 1.165L5.1 17.21c-.051.32-.19.51-.437.533H1.178c-.386 0-.523-.29-.422-.934L3.26.94C3.36.304 3.712 0 4.4 0z"
                      fill="#113984"
                    />
                    <path
                      d="M5.958 11.758l.986-6.242c.086-.548.386-.81.983-.81h5.641c.934 0 1.69.146 2.28.415-.566 3.838-3.049 5.97-6.299 5.97H6.77c-.372.002-.646.188-.81.667z"
                      fill="#172C70"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_9489_2679">
                      <path
                        fill="#fff"
                        transform="translate(.724)"
                        d="M0 0H82.5526V20H0z"
                      />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </div>
          </div>

          <div className="lg:w-1/2">
            <div className="bg-background-50 rounded-xl p-5 sm:p-10">
              <div className="mb-8">
                <p className="text-title-50 text-base font-medium">
                  Estimated Delivery
                </p>
                <span className="text-text-100 text-sm">Jul 20 - Jul 23</span>
              </div>
              <div className="space-y-8">
                {/* <!-- Cart Items --> */}
                <ul className="divide-base-50 divide-y">
                  {/* <!-- Item 1 --> */}
                  <li className="flex items-start space-x-4 py-4">
                    <img
                      src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/checkout/checkout-01/product-1.jpg"
                      className="h-16 w-16 shrink-0 rounded-md object-cover"
                      alt="product-1"
                    />
                    <div className="flex-1">
                      <h3 className="text-title-50 text-base">
                        Silver Hoop Earrings
                      </h3>
                      <p className="text-text-100 text-sm">
                        Silver – 1x • Size 5
                      </p>
                      <p className="text-title-50 mt-1 text-sm font-semibold">
                        $300
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start space-x-4 py-4">
                    <img
                      src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/checkout/checkout-01/product-2.jpg"
                      className="h-16 w-16 shrink-0 rounded-md object-cover"
                      alt="product-2"
                    />
                    <div className="flex-1">
                      <h3 className="text-title-50 text-base">Gold Necklace</h3>
                      <p className="text-text-100 text-sm">
                        Gold – 1x • Size 7
                      </p>
                      <p className="text-title-50 mt-1 text-sm font-semibold">
                        $900
                      </p>
                    </div>
                  </li>
                </ul>
                {/* <!-- Discount Code --> */}
                <div className="space-y-2">
                  <label className="text-title-50 mb-1.5 block text-sm font-medium">
                    Discount Code
                  </label>
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Summer24"
                        x-model="discount"
                      />
                    </div>
                    <Button className="px-17"> Apply</Button>
                  </div>
                </div>
                {/* <!-- Summary --> */}
                <div>
                  <ul className="border-base-50 space-y-3 border-b pb-5">
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
                    <span className="text-lg font-medium">Total Amount</span>
                    <span className="text-lg font-medium">$1200</span>
                  </div>
                </div>
                {/* <!-- Button --> */}
                <div>
                  <Button className="h-12 w-full">Process to checkout</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
