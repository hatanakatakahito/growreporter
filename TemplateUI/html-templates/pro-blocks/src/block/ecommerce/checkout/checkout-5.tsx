import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';

export default function Checkout5() {
  return (
    <section className="bg-background-50 py-16 sm:py-28">
      <div className="mx-auto max-w-[1440px] px-4 xl:px-0">
        <div className="flex flex-col lg:flex-row">
          {/* <!-- Left Column --> */}
          <div className="bg-background-soft-50 px-5 py-20 sm:px-16 lg:w-5/12">
            <div>
              <h3 className="text-title-50 mb-4 text-3xl font-semibold sm:text-4xl">
                TailAdmin Business Pack
              </h3>
              <p className="text-text-100 text-base">
                Best suited for agencies and small business.
              </p>
              {/* <!-- Images --> */}
              <div className="my-11">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/checkout/checkout-05/product-1.jpg"
                  className="w-full rounded-2xl"
                  alt="Visa"
                />
              </div>
              {/* <!-- Discount --> */}
              <div className="mb-9">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Enter your coupon code"
                      x-model="discount"
                    />
                  </div>
                  <Button className="px-5">Apply</Button>
                </div>
              </div>
              {/* <!-- Summary --> */}
              <div>
                <ul className="border-base-200 space-y-3 border-b pb-5">
                  <li className="text-text-50 flex justify-between text-base">
                    <span>Subtotal</span>
                    <span className="font-medium">$239</span>
                  </li>
                  <li className="text-text-50 flex justify-between text-base">
                    <span>Discount</span>
                    <span className="font-medium">$0.00</span>
                  </li>

                  <li className="text-text-50 flex justify-between text-base">
                    <span>Vat(10%)</span>
                    <span className="font-medium">$23.9</span>
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
            </div>
          </div>
          {/* <!-- Right Column --> */}
          <div className="bg-background-50 px-5 py-20 sm:px-16 lg:w-7/12">
            <div>
              <div>
                <div className="flex flex-col gap-5 sm:flex-row">
                  <a
                    href="javascript:void(0)"
                    className="bg-background-soft-100 flex h-15 w-full items-center justify-center rounded-lg p-4"
                  >
                    <svg
                      className="block"
                      xmlns="http://www.w3.org/2000/svg"
                      width="70"
                      height="34"
                      viewBox="0 0 70 34"
                      fill="none"
                    >
                      <g clip-path="url(#clip0_9492_4042)">
                        <path
                          d="M33.075 17.5634V25.6185H30.45V5.69727H37.275C38.9375 5.69727 40.5125 6.30356 41.7375 7.42955C42.9625 8.46892 43.575 10.028 43.575 11.6736C43.575 13.3193 42.9625 14.7918 41.7375 15.9177C40.5125 17.0437 39.025 17.65 37.275 17.65L33.075 17.5634ZM33.075 8.12246V15.0516H37.45C38.4125 15.0516 39.375 14.7051 39.9875 14.0122C41.3875 12.713 41.3875 10.5477 40.075 9.24845L39.9875 9.16183C39.2875 8.46892 38.4125 8.03585 37.45 8.12246H33.075Z"
                          fill="#1F2937"
                        />
                        <path
                          d="M49.6125 11.5869C51.5375 11.5869 53.025 12.1066 54.1625 13.146C55.3 14.1853 55.825 15.5712 55.825 17.3034V25.6184H53.375V23.7129H53.2875C52.2375 25.272 50.75 26.0515 49 26.0515C47.5125 26.0515 46.2 25.6184 45.15 24.7523C44.1875 23.8861 43.575 22.6735 43.575 21.3743C43.575 19.9885 44.1 18.8625 45.15 17.9964C46.2 17.1302 47.6875 16.7838 49.4375 16.7838C51.0125 16.7838 52.2375 17.0436 53.2 17.6499V17.0436C53.2 16.1775 52.85 15.3113 52.15 14.7916C51.45 14.1853 50.575 13.8389 49.6125 13.8389C48.125 13.8389 46.9875 14.4452 46.2 15.6578L43.925 14.272C45.325 12.4531 47.1625 11.5869 49.6125 11.5869ZM46.2875 21.4609C46.2875 22.1538 46.6375 22.7601 47.1625 23.1066C47.775 23.5397 48.475 23.7995 49.175 23.7995C50.225 23.7995 51.275 23.3664 52.0625 22.5869C52.9375 21.8074 53.375 20.8546 53.375 19.8153C52.5875 19.209 51.45 18.8625 49.9625 18.8625C48.9125 18.8625 48.0375 19.1223 47.3375 19.642C46.6375 20.0751 46.2875 20.6814 46.2875 21.4609Z"
                          fill="#1F2937"
                        />
                        <path
                          d="M69.9999 12.0195L61.3374 31.681H58.7124L61.95 24.8384L56.2625 12.1061H59.0624L63.1749 21.8935H63.2625L67.2874 12.1061H69.9999V12.0195Z"
                          fill="#1F2937"
                        />
                        <path
                          d="M22.6625 15.8308C22.6625 15.0512 22.575 14.2717 22.4875 13.4922H11.55V17.9095H17.7625C17.5 19.2953 16.7125 20.5946 15.4875 21.3741V24.2323H19.25C21.4375 22.2402 22.6625 19.2953 22.6625 15.8308Z"
                          fill="#4285F4"
                        />
                        <path
                          d="M11.5501 27.004C14.7001 27.004 17.3251 25.9647 19.2501 24.2324L15.4876 21.3741C14.4376 22.067 13.1251 22.5001 11.5501 22.5001C8.5751 22.5001 5.9501 20.508 5.0751 17.7363H1.2251V20.6812C3.2376 24.5788 7.1751 27.004 11.5501 27.004Z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.0749 17.7362C4.5499 16.3504 4.5499 14.7913 5.0749 13.3189V10.374H1.2249C-0.437598 13.5787 -0.437598 17.3898 1.2249 20.6811L5.0749 17.7362Z"
                          fill="#FBBC04"
                        />
                        <path
                          d="M11.55 8.64141C13.2125 8.64141 14.7875 9.24771 16.0125 10.3737L19.3375 7.08235C17.2375 5.17684 14.4375 4.05086 11.6375 4.13747C7.2625 4.13747 3.2375 6.56267 1.3125 10.4603L5.1625 13.4052C5.95 10.6335 8.575 8.64141 11.55 8.64141Z"
                          fill="#EA4335"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_9492_4042">
                          <rect
                            width="70"
                            height="33"
                            fill="white"
                            transform="translate(0 0.5)"
                          />
                        </clipPath>
                      </defs>
                    </svg>
                  </a>
                  <a
                    href="javascript:void(0)"
                    className="bg-background-soft-100 flex h-15 w-full items-center justify-center rounded-lg p-4"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="100"
                      height="24"
                      viewBox="0 0 100 24"
                      fill="none"
                    >
                      <g clip-path="url(#clip0_9492_4051)">
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M8.72587 5.64941H15.5592C19.228 5.64941 20.6092 7.48938 20.3957 10.1926C20.043 14.6553 17.3195 17.1243 13.7071 17.1243H11.8832C11.3876 17.1243 11.0542 17.4493 10.9201 18.33L10.1458 23.4498C10.0946 23.7818 9.91826 23.974 9.65367 24.0002H5.36037C4.95644 24.0002 4.81357 23.6944 4.9194 23.0322L7.53701 6.6192C7.63932 5.96219 8.00267 5.64941 8.72587 5.64941Z"
                          fill="#009EE3"
                        />
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M38.393 5.34473C40.6984 5.34473 42.8256 6.58361 42.5346 9.67119C42.1818 13.3407 40.1974 15.3711 37.0665 15.3798H34.3307C33.9374 15.3798 33.7469 15.6978 33.6446 16.3496L33.1154 19.6818C33.036 20.1851 32.775 20.4332 32.3905 20.4332H29.8452C29.4395 20.4332 29.2984 20.1763 29.3883 19.6014L31.4891 6.24637C31.5932 5.58936 31.8419 5.34473 32.2952 5.34473H38.3877H38.393ZM34.2478 12.4949H36.3204C37.6169 12.446 38.4776 11.5566 38.5641 9.95252C38.617 8.96176 37.9414 8.25233 36.8672 8.25757L34.9164 8.26631L34.2478 12.4949ZM49.4543 19.411C49.6871 19.2013 49.9235 19.093 49.89 19.3516L49.8071 19.9701C49.7648 20.2934 49.8935 20.4646 50.1969 20.4646H52.4582C52.8392 20.4646 53.0244 20.3126 53.1179 19.729L54.5114 11.0656C54.5819 10.6305 54.4743 10.4173 54.141 10.4173H51.6539C51.4299 10.4173 51.3205 10.5414 51.2623 10.8804L51.1706 11.4133C51.1229 11.6911 50.9942 11.7401 50.8742 11.4605C50.4527 10.4715 49.3767 10.0277 47.8756 10.0626C44.3884 10.1342 42.0372 12.757 41.7849 16.119C41.5909 18.719 43.4712 20.7617 45.9512 20.7617C47.7504 20.7617 48.5547 20.2375 49.4614 19.4162L49.4543 19.411ZM47.5599 18.0777C46.0588 18.0777 45.0128 16.8913 45.2298 15.4375C45.4468 13.9837 46.8508 12.7972 48.3519 12.7972C49.853 12.7972 50.8989 13.9837 50.682 15.4375C50.465 16.8913 49.0627 18.0777 47.5599 18.0777ZM58.937 10.3894H56.6439C56.1712 10.3894 55.9789 10.7388 56.1289 11.1687L58.9758 19.4267L56.1835 23.3565C55.9489 23.685 56.1306 23.9838 56.4605 23.9838H59.0375C59.1877 24.001 59.3397 23.9751 59.4755 23.9091C59.6112 23.8431 59.7249 23.7399 59.803 23.6116L68.559 11.1704C68.8288 10.7878 68.7019 10.3859 68.2591 10.3859H65.8197C65.4016 10.3859 65.234 10.5501 64.9942 10.8943L61.3429 16.1364L59.7113 10.8821C59.6161 10.5641 59.3779 10.3894 58.9387 10.3894H58.937Z"
                          fill="#113984"
                        />
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M77.6676 5.3453C79.973 5.3453 82.1002 6.58418 81.8092 9.67176C81.4564 13.3412 79.472 15.3716 76.3411 15.3804H73.6071C73.2138 15.3804 73.0233 15.6984 72.921 16.3502L72.3918 19.6824C72.3124 20.1856 72.0514 20.4338 71.6668 20.4338H69.1215C68.7158 20.4338 68.5747 20.1769 68.6647 19.602L70.769 6.24344C70.8731 5.58643 71.1218 5.3418 71.5751 5.3418H77.6676V5.3453ZM73.5224 12.4955H75.595C76.8915 12.4466 77.7522 11.5572 77.8387 9.95308C77.8916 8.96233 77.216 8.2529 76.1418 8.25814L74.191 8.26688L73.5224 12.4955ZM88.7289 19.4115C88.9618 19.2019 89.1981 19.0935 89.1646 19.3521L89.0817 19.9707C89.0394 20.294 89.1681 20.4652 89.4715 20.4652H91.7328C92.1138 20.4652 92.299 20.3132 92.3925 19.7296L93.786 11.0662C93.8565 10.6311 93.7489 10.4179 93.4156 10.4179H90.932C90.708 10.4179 90.5986 10.5419 90.5404 10.8809L90.4487 11.4139C90.4011 11.6917 90.2723 11.7406 90.1524 11.4611C89.7308 10.4721 88.6548 10.0282 87.1538 10.0632C83.6666 10.1348 81.3153 12.7576 81.0631 16.1195C80.869 18.7196 82.7493 20.7623 85.2294 20.7623C87.0285 20.7623 87.8329 20.2381 88.7395 19.4168L88.7289 19.4115ZM86.8363 18.0783C85.3352 18.0783 84.2892 16.8919 84.5062 15.4381C84.7231 13.9842 86.1272 12.7978 87.6283 12.7978C89.1293 12.7978 90.1753 13.9842 89.9583 15.4381C89.7414 16.8919 88.3373 18.0783 86.8363 18.0783ZM97.2661 20.4792H94.6556C94.6102 20.4812 94.5649 20.4733 94.5229 20.4559C94.481 20.4386 94.4434 20.4123 94.4129 20.3789C94.3824 20.3455 94.3597 20.3059 94.3465 20.2628C94.3333 20.2197 94.3298 20.1743 94.3363 20.1297L96.6294 5.73845C96.6513 5.64023 96.7061 5.55224 96.7848 5.48879C96.8636 5.42534 96.9618 5.39016 97.0633 5.38898H99.6738C99.7192 5.38697 99.7645 5.39491 99.8065 5.41225C99.8484 5.42959 99.886 5.45589 99.9165 5.48927C99.947 5.52266 99.9697 5.5623 99.9829 5.60538C99.9962 5.64845 99.9996 5.69389 99.9931 5.73845L97.7001 20.1297C97.6789 20.2286 97.6244 20.3174 97.5455 20.3815C97.4667 20.4456 97.3681 20.4813 97.2661 20.4827V20.4792Z"
                          fill="#009EE3"
                        />
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M4.45223 0H11.2926C13.2187 0 15.5047 0.0611576 17.0322 1.39789C18.0535 2.29079 18.5898 3.71139 18.4663 5.24208C18.0465 10.416 14.9226 13.3149 10.7317 13.3149H7.35911C6.78409 13.3149 6.40485 13.6923 6.24257 14.7128L5.30066 20.6538C5.23893 21.0382 5.07136 21.2654 4.7715 21.2933H0.550524C0.0830944 21.2933 -0.0827122 20.9439 0.0389957 20.1715L3.07288 1.12879C3.19458 0.363449 3.61968 0 4.45223 0Z"
                          fill="#113984"
                        />
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M6.34131 14.1099L7.53546 6.619C7.63953 5.96199 8.00289 5.64746 8.72608 5.64746H15.5594C16.69 5.64746 17.6055 5.8222 18.3216 6.14546C17.6355 10.7515 14.628 13.3096 10.6911 13.3096H7.32379C6.87224 13.3114 6.54063 13.5351 6.34131 14.1099Z"
                          fill="#172C70"
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_9492_4051">
                          <rect width="100" height="24" fill="white" />
                        </clipPath>
                      </defs>
                    </svg>
                  </a>
                </div>
                <div className="my-8 flex items-center sm:flex-row">
                  <div className="bg-background-soft-200 h-px grow"></div>
                  <p className="text-title-50 mx-4 text-base">Or Pay With</p>
                  <div className="bg-background-soft-200 h-px grow"></div>
                </div>
              </div>
              <div className="space-y-10 sm:space-y-11">
                <div>
                  <h3 className="text-title-50 mb-6 text-xl font-semibold">
                    Card Details
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <label className="text-text-50 mb-1.5 block text-sm font-medium">
                        Name on Card
                      </label>
                      <Input type="text" placeholder="David Watson" />
                    </div>
                    <div>
                      <label className="text-title-50 mb-3 block text-sm font-medium">
                        Card Information
                      </label>
                      <div className="border-base-200 relative overflow-hidden rounded-xl border">
                        <div className="border-base-200 border-b">
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
                        <div className="divide-base-200 flex divide-x">
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
                <div>
                  <h3 className="text-title-50 mb-6 text-xl font-semibold">
                    Billing Address
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <label className="text-text-50 mb-1.5 block text-sm font-medium">
                        Email Address
                      </label>
                      <Input type="text" placeholder="hello@pimjo.com" />
                    </div>
                    <div>
                      <label className="text-text-50 mb-1.5 block text-sm font-medium">
                        Address Line
                      </label>
                      <Input
                        type="text"
                        placeholder="30 N Gould St Ste R Sheridan, WY 82801"
                      />
                    </div>
                    <div className="col-span-full">
                      <div className="grid gap-5 sm:grid-cols-3">
                        <div>
                          <label className="text-text-50 mb-1.5 block text-sm font-medium">
                            Zip code
                          </label>
                          <Input type="text" placeholder="82801" />
                        </div>
                        <div>
                          <label className="text-text-50 mb-1.5 block text-sm font-medium">
                            City
                          </label>
                          <Input type="text" placeholder="Sheridan" />
                        </div>
                        <div>
                          <label className="text-text-50 mb-1.5 block text-sm font-medium">
                            Country
                          </label>
                          <select className="focus:border-primary-300 focus:ring-primary-500/30 text-title-50 border-base-200 placeholder:text-input-placeholder-text h-11 w-full rounded-lg border px-4 py-2.5 text-base ring-3 ring-transparent placeholder:text-sm focus:outline-0">
                            <option value="0">Select Country</option>
                            <option value="1">USA</option>
                            <option value="2">UK</option>
                            <option value="3">BD</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <Button className="h-12 w-full">Pay $262.9</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
