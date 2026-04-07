import { Button } from '@/components/core/button';
import { Checkbox } from '@/components/core/checkbox';
import { Input } from '@/components/core/input';
import { TextArea } from '@/components/core/text-area';
import { TruckDelivery2x } from '@tailgrids/icons';
import { useState } from 'react';

export default function Checkout2() {
  const [delivery, setDelivery] = useState('fedex');
  const [payment, setPayment] = useState('paypal');
  return (
    <section className="bg-background-soft-100 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="space-y-8 lg:w-4/5">
            <div className="bg-background-50 rounded-xl p-5 sm:p-8">
              <h3 className="text-title-50 text-2xl font-medium">
                Shopping card
              </h3>
              <p className="text-text-100 text-sm">
                You have 2 item in your cart
              </p>
              <ul className="divide-base-50 my-4 divide-y">
                {/* <!-- Item 1 --> */}
                <li className="flex items-start space-x-4 py-4">
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/checkout/checkout-02/product-1.jpg"
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
                    <p className="text-text-50 mt-1 text-sm font-semibold">
                      $300
                    </p>
                  </div>
                </li>
                <li className="flex items-start space-x-4 py-4">
                  <img
                    src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/checkout/checkout-02/product-2.jpg"
                    className="h-16 w-16 shrink-0 rounded-md object-cover"
                    alt="product-2"
                  />
                  <div className="flex-1">
                    <h3 className="text-title-50 text-base">Gold Necklace</h3>
                    <p className="text-text-100 text-sm">Gold – 1x • Size 7</p>
                    <p className="text-text-50 mt-1 text-sm font-semibold">
                      $900
                    </p>
                  </div>
                </li>
              </ul>
              {/* <!-- Discount Code --> */}
              <div className="space-y-2">
                <label className="text-text-50 mb-1.5 block text-sm font-medium">
                  Have a promo code?
                </label>
                <div className="flex flex-col gap-5 sm:flex-row">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Enter code here"
                      x-model="discount"
                    />
                  </div>
                  <Button className="px-14">Apply</Button>
                </div>
              </div>
            </div>
            <div className="bg-background-50 rounded-xl p-5 sm:p-8">
              <h3 className="text-title-50 font-medium">Summery</h3>
              <p className="text-text-100 text-sm">Your total price is here</p>
              {/* <!-- Summary --> */}
              <div className="my-8">
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
                  <span className="text-title-50 text-lg font-medium">
                    Total Payable
                  </span>
                  <span className="text-title-50 text-lg font-medium">
                    $1161.49
                  </span>
                </div>
              </div>
              {/* <!-- Button --> */}
              <div>
                <Button className="h-12 w-full">Process to checkout</Button>
              </div>
            </div>
          </div>
          <div className="bg-background-50 rounded-xl p-5 sm:p-10 lg:w-5/6">
            <h2 className="text-title-50 mb-5 text-2xl font-semibold">
              Fill up this information
            </h2>
            <form>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="relative col-span-full">
                  <label
                    htmlFor="full-name"
                    className="text-text-50 mb-2 block text-sm font-medium"
                  >
                    Full Name
                  </label>
                  <Input type="text" placeholder="David Watson" />
                </div>
                <div className="relative col-span-full">
                  <label
                    htmlFor="address"
                    className="text-text-50 mb-2 block text-sm font-medium"
                  >
                    Address
                  </label>
                  <Input
                    type="text"
                    placeholder="30 N Gould St Ste R Sheridan, WY 82801"
                  />
                </div>
                <div className="relative">
                  <label
                    htmlFor="full-name"
                    className="text-text-50 mb-2 block text-sm font-medium"
                  >
                    City
                  </label>
                  <Input type="text" placeholder="New York" />
                </div>
                <div className="relative">
                  <label
                    htmlFor="full-name"
                    className="text-text-50 mb-2 block text-sm font-medium"
                  >
                    State
                  </label>
                  <Input type="text" placeholder="Wyoming" />
                </div>
                <div className="relative">
                  <label
                    htmlFor="full-name"
                    className="text-text-50 mb-2 block text-sm font-medium"
                  >
                    Zip code
                  </label>
                  <Input type="text" placeholder="Sheridan" />
                </div>
                <div className="relative">
                  <label
                    htmlFor="full-name"
                    className="text-text-50 mb-2 block text-sm font-medium"
                  >
                    Country
                  </label>
                  <Input type="text" placeholder="USA" />
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
                    label="Use shipping address as billing address"
                  />
                </div>
              </div>
            </form>
            <div className="space-y-10 py-10">
              {/* Delivery With */}
              <div>
                <h2 className="text-title-50 mb-5 text-2xl font-semibold">
                  Delivery With
                </h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div
                    onClick={() => setDelivery('fedex')}
                    className={`ring-background-soft-400 flex cursor-pointer items-center rounded-lg border-2 px-7 py-4 ring-1 transition-all ${
                      delivery === 'fedex'
                        ? 'border-primary-500 ring-transparent'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="pr-6">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="65"
                        height="18"
                        viewBox="0 0 65 18"
                        fill="none"
                      >
                        <g clip-path="url(#clip0_9489_3071)">
                          <path
                            d="M64.5354 15.6595C64.5354 14.6591 63.826 13.9265 62.8488 13.9265C61.8731 13.9265 61.1629 14.6591 61.1629 15.6595C61.1629 16.6582 61.8731 17.3895 62.8488 17.3895C63.826 17.3895 64.5354 16.657 64.5354 15.6595ZM62.4056 15.7483V16.8802H62.0399V14.3843H62.9486C63.481 14.3843 63.7254 14.6169 63.7254 15.0702C63.7254 15.3494 63.5366 15.5706 63.2935 15.6026V15.6132C63.5046 15.6469 63.5821 15.8352 63.6255 16.1797C63.6588 16.403 63.703 16.7901 63.7826 16.881H63.35C63.2493 16.6465 63.2595 16.3145 63.1819 16.0365C63.1178 15.825 63.005 15.7479 62.7627 15.7479H62.4076V15.7491L62.4056 15.7483ZM62.8589 15.4257C63.214 15.4257 63.3155 15.2366 63.3155 15.0698C63.3155 14.8725 63.214 14.7167 62.8589 14.7167H62.4056V15.4265H62.8589V15.4257ZM60.7607 15.6595C60.7607 14.4269 61.7392 13.5938 62.8471 13.5938C63.9583 13.5938 64.9355 14.4269 64.9355 15.6595C64.9355 16.8895 63.9587 17.7235 62.8471 17.7235C61.7392 17.7235 60.7607 16.8895 60.7607 15.6595Z"
                            fill="#FF5A00"
                          />
                          <path
                            d="M53.5298 17.3632L51.1244 14.6656L48.7401 17.3632H43.7231L48.6264 11.8544L43.7231 6.34396H48.8967L51.3265 9.02086L53.6645 6.34396H58.6571L53.7781 11.8313L58.7249 17.3632H53.5298ZM34.0894 17.3632V0.00439453H43.7231V3.87364H38.17V6.34396H43.7231V10.0671H38.17V13.4842H43.7231V17.3632H34.0894Z"
                            fill="#FF5A00"
                          />
                          <path
                            d="M30.0238 0.00439453V7.10856H29.9788C29.079 6.07449 27.9544 5.71411 26.6505 5.71411C23.9785 5.71411 21.9655 7.53185 21.2589 9.93319C20.453 7.28673 18.3747 5.6646 15.2936 5.6646C12.7908 5.6646 10.8151 6.78755 9.7831 8.61787V6.34356H4.61071V3.87405H10.2559V0.00520731H0V17.3632H4.61071V10.0671H9.20641C9.06485 10.6282 8.99408 11.2048 8.99578 11.7834C8.99578 15.4026 11.7616 17.946 15.2927 17.946C18.261 17.946 20.2188 16.5512 21.2533 14.0118H17.3016C16.7676 14.776 16.3617 15.0017 15.2931 15.0017C14.0545 15.0017 12.9856 13.9205 12.9856 12.6405H21.0317C21.3807 15.5159 23.6209 17.9951 26.6955 17.9951C28.0218 17.9951 29.2361 17.343 29.9783 16.2411H30.023V17.3657H34.0883V0.00520731H30.0238V0.00439453ZM13.1138 10.1191C13.3707 9.016 14.2258 8.29523 15.2931 8.29523C16.4684 8.29523 17.2801 8.99368 17.4932 10.1191H13.1138ZM27.5567 14.7217C26.0588 14.7217 25.1278 13.326 25.1278 11.8682C25.1278 10.3098 25.9378 8.81267 27.5567 8.81267C29.2365 8.81267 29.9057 10.3106 29.9057 11.8682C29.9057 13.3446 29.1971 14.7217 27.5567 14.7217Z"
                            fill="#29007C"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_9489_3071">
                            <rect width="64.9351" height="18" fill="white" />
                          </clipPath>
                        </defs>
                      </svg>
                    </div>
                    <div className="border-base-100 border-l pl-6">
                      <h3 className="text-base font-semibold">$5.99</h3>
                      <p className="text-text-100 text-xs">3-5 days</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setDelivery('dhl')}
                    className={`ring-background-soft-400 flex cursor-pointer items-center rounded-lg border-2 px-7 py-4 ring-1 transition-all ${
                      delivery === 'dhl'
                        ? 'border-primary-500 ring-transparent'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="pr-6">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="65"
                        height="20"
                        viewBox="0 0 65 20"
                        fill="none"
                      >
                        <g clip-path="url(#clip0_9489_3081)">
                          <path
                            d="M64.6828 0.00341797V14.2778H0V0.00341797H64.6828Z"
                            fill="#FFCC00"
                          />
                          <path
                            d="M11.3752 2.56689L9.30859 5.37451H20.5716C21.1409 5.37451 21.1334 5.59084 20.8551 5.9678C20.5725 6.35047 20.0996 7.01598 19.8117 7.4047C19.6657 7.60197 19.4016 7.96136 20.2768 7.96136H24.8827C24.8827 7.96136 25.6251 6.95117 26.2472 6.10654C27.0939 4.95773 26.3207 2.56701 23.2941 2.56701L11.3752 2.56689Z"
                            fill="#D2002E"
                          />
                          <path
                            d="M8.47238 11.7138L12.6232 6.07379H17.7741C18.3434 6.07379 18.336 6.29011 18.0577 6.66708C17.7751 7.04975 17.2945 7.70818 17.0066 8.0969C16.8604 8.29417 16.5964 8.65414 17.4715 8.65414H24.3722C23.7983 9.44036 21.9367 11.7137 18.5941 11.7137L8.47238 11.7138ZM32.2444 8.65345L29.9934 11.7136H24.0558C24.0558 11.7136 26.3055 8.65414 26.3074 8.65414L32.2444 8.65345ZM41.3406 7.96136H26.8175L30.789 2.56689H36.725L34.4486 5.66009H37.0982L39.3755 2.56689H45.3108L41.3406 7.96136ZM40.8309 8.65425L38.5789 11.7138H32.6434C32.6434 11.7138 34.8931 8.65425 34.895 8.65425H40.8309ZM0 9.86068H8.74734L8.26952 10.5107H0V9.86068ZM0 8.65425H9.63602L9.15728 9.30333H0V8.65425ZM0 11.0678H7.85912L7.38358 11.7138H0V11.0678ZM64.6831 10.5107H55.9694L56.4477 9.86079H64.6831V10.5107ZM64.6831 11.7138L55.0836 11.7147L55.5591 11.0678H64.6831V11.7138ZM57.3352 8.65425H64.6831V9.30367L56.8574 9.30424L57.3352 8.65425ZM53.5313 2.56689L49.5605 7.96125H43.2706C43.2706 7.96125 47.2425 2.56689 47.2445 2.56689H53.5313ZM42.7617 8.65425C42.7617 8.65425 42.3278 9.2472 42.1172 9.5322C41.3716 10.5399 42.0307 11.7138 44.4637 11.7138H53.9966L56.2484 8.65425H42.7617Z"
                            fill="#D2002E"
                          />
                          <path
                            d="M0 16.5986H64.6831V16.922H0V16.5986ZM0 18.1075H64.6831V18.4309H0V18.1075ZM0 19.6161H64.6831V19.9394H0V19.6161Z"
                            fill="#FFCC00"
                          />
                          <path
                            d="M21.7202 19.9391H23.6669L23.9776 19.5179H22.5289L23.3413 18.4172H24.6605L24.9713 17.9959H23.6521L24.3724 17.0198H25.8212L26.132 16.5985H24.1854L21.7202 19.9391ZM24.1092 19.9391H24.7066L26.7429 18.5225L26.7229 19.9391H27.3502L27.3549 18.1923L29.7009 16.5985H29.1333L27.2659 17.8812L27.2863 16.5985H26.6889L26.6707 18.2019L24.1092 19.9391ZM30.4544 17.0198H30.8776C31.1864 17.0198 31.5313 17.1729 31.2205 17.594C30.8955 18.0342 30.3977 18.1826 30.089 18.1826H29.5961L30.4544 17.0198ZM27.8022 19.9391H28.3L29.2853 18.6038H29.7732C30.4005 18.6038 31.1971 18.3406 31.7445 17.5987C32.3061 16.8377 31.8902 16.5983 31.1784 16.5983H30.2673L27.8022 19.9391ZM30.6691 19.9391H31.167L32.2618 18.4554H32.5604C32.8242 18.4554 32.9887 18.4554 32.9029 18.7808L32.5809 19.9391H33.1485L33.4733 18.6085C33.5156 18.4028 33.494 18.331 33.3819 18.2734L33.3889 18.2638C33.8418 18.1967 34.3672 17.9097 34.6675 17.5028C35.2572 16.7037 34.6728 16.5983 33.9856 16.5983H33.1344L30.6691 19.9391ZM33.3214 17.0198H33.7992C34.2574 17.0198 34.355 17.2112 34.1326 17.5125C33.896 17.8334 33.4688 18.0342 32.9958 18.0342H32.5726L33.3214 17.0198ZM33.664 19.9391H35.6107L35.9212 19.5179H34.4727L35.2849 18.4172H36.6043L36.9149 17.9959H35.5957L36.3161 17.0198H37.7649L38.0758 16.5985H36.1292L33.664 19.9391ZM40.4737 16.6607C40.2948 16.5794 40.049 16.541 39.8201 16.541C39.1928 16.541 38.4718 16.8571 38.0338 17.4505C37.2674 18.4891 38.9129 18.2832 38.3618 19.0299C38.0723 19.4221 37.5609 19.5755 37.2773 19.5755C37.0232 19.5755 36.7952 19.4796 36.6754 19.4125L36.2973 19.8577C36.4733 19.9295 36.663 19.9966 36.9069 19.9966C37.6038 19.9966 38.3848 19.7138 38.911 19.0008C39.7232 17.9002 38.1201 18.0483 38.5934 17.4072C38.8514 17.0579 39.2506 16.9621 39.5294 16.9621C39.7883 16.9621 39.8957 17.0054 40.0789 17.101L40.4737 16.6607ZM42.963 16.6607C42.7841 16.5794 42.5385 16.541 42.3094 16.541C41.6821 16.541 40.9611 16.8571 40.5231 17.4505C39.7567 18.4891 41.4022 18.2832 40.8511 19.0299C40.5617 19.4221 40.0502 19.5755 39.7666 19.5755C39.5125 19.5755 39.2844 19.4796 39.1648 19.4125L38.7866 19.8577C38.9626 19.9295 39.1523 19.9966 39.3961 19.9966C40.0931 19.9966 40.8739 19.7138 41.4001 19.0008C42.2125 17.9002 40.6095 18.0483 41.0827 17.4072C41.3406 17.0579 41.7399 16.9621 42.0187 16.9621C42.2776 16.9621 42.3852 17.0054 42.5682 17.101L42.963 16.6607Z"
                            fill="#D2002E"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_9489_3081">
                            <rect width="64.6831" height="20" fill="white" />
                          </clipPath>
                        </defs>
                      </svg>
                    </div>
                    <div className="border-base-100 grow border-l pl-6">
                      <h3 className="text-base font-semibold">$12.50</h3>
                      <p className="text-text-100 text-xs">
                        Delivery , Tomorrow
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Select Payment */}
              <div>
                <h2 className="text-title-50 mb-5 text-2xl font-semibold">
                  Select Payment
                </h2>
                <div className="border-base-100 grid grid-cols-1 gap-5 rounded-lg border p-5 sm:grid-cols-2">
                  <div
                    onClick={() => setPayment('paypal')}
                    className={`ring-background-soft-400 flex cursor-pointer items-center rounded-lg border-2 p-3.5 ring-1 transition-all ${
                      payment === 'paypal'
                        ? 'border-primary-500 ring-transparent'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="border-base-100 inline-flex h-10 w-10 items-center justify-center rounded-md border">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={18}
                        height={20}
                        viewBox="0 0 18 20"
                        fill="none"
                      >
                        <path
                          d="M15.636 5.213c.234-1.524 0-2.54-.818-3.478C13.922.68 12.286.25 10.182.25H4.144c-.429 0-.78.313-.857.742L.754 17.015a.514.514 0 00.507.586H5l-.273 1.641c-.039.273.156.508.468.508H8.35c.39 0 .701-.273.74-.625l.663-4.143c.039-.351.39-.625.74-.625h.467c3.04 0 5.455-1.25 6.156-4.845.273-1.485.156-2.775-.624-3.635-.233-.273-.506-.469-.857-.664"
                          fill="#009CDE"
                        />
                        <path
                          d="M15.636 5.213c.234-1.524 0-2.54-.818-3.478C13.922.68 12.286.25 10.182.25H4.144c-.429 0-.78.313-.857.742L.754 17.015a.514.514 0 00.507.586H5l.896-5.784c.078-.43.428-.742.857-.742h1.792c3.506 0 6.233-1.407 7.012-5.55.04-.078.04-.195.078-.312z"
                          fill="#012169"
                        />
                        <path
                          d="M6.949 5.252c.039-.274.39-.625.74-.625h4.753c.545 0 1.09.039 1.558.117.429.078 1.208.274 1.597.508.234-1.524 0-2.54-.818-3.478C13.922.68 12.286.25 10.182.25H4.144c-.429 0-.78.313-.857.742L.754 17.015a.514.514 0 00.507.586H5L6.949 5.252z"
                          fill="#003087"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-title-50 text-base">
                        Paypal last 4566
                      </h3>
                      <p className="text-text-100 text-xs">Expire 05/2028</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setPayment('master')}
                    className={`ring-background-soft-400 flex cursor-pointer items-center rounded-xl border-2 p-3.5 ring-1 transition-all ${
                      payment === 'master'
                        ? 'border-primary-500 ring-transparent'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="border-base-100 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={24}
                        height={24}
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle cx={7.5} cy={12} r={6.75} fill="#E80B26" />
                        <circle cx={16.5} cy={12} r={6.75} fill="#F59D31" />
                        <path
                          d="M12 17.031A6.733 6.733 0 0014.25 12c0-2-.869-3.795-2.25-5.031a6.733 6.733 0 00-2.25 5.03c0 2 .869 3.796 2.25 5.032z"
                          fill="#FC6020"
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

                  <div
                    onClick={() => setPayment('cod')}
                    className={`ring-background-soft-400 flex cursor-pointer items-center rounded-xl border-2 p-3.5 ring-1 transition-all ${
                      payment === 'cod'
                        ? 'border-primary-500 ring-transparent'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="border-base-100 text-text-50 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                      <TruckDelivery2x className="size-5" />
                    </div>
                    <div className="ml-4 shrink-0">
                      <h3 className="text-title-50 text-base">
                        Cash on Delivery
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
