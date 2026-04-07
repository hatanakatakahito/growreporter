import { Button } from '@/components/core/button';
import { Checkbox } from '@/components/core/checkbox';
import { Input } from '@/components/core/input';
import {
  ArrowLeft,
  Bank1,
  CreditCard,
  Headphone1Mic,
  RefreshCircle1Clockwise,
  Shield1Check,
} from '@tailgrids/icons';
import { useState } from 'react';

export default function Checkout6() {
  const [selected, setSelected] = useState('card');
  const [discount, setDiscount] = useState('');
  return (
    <section className="bg-background-soft-100 py-16 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="bg-background-50 mx-auto max-w-2xl px-5 py-11 sm:p-16">
          <div className="mb-8">
            <a
              href="javascript:void(0)"
              className="text-text-100 hover:bg-background-soft-100 inline-flex items-center gap-2 rounded-lg bg-transparent px-3 py-2 text-base font-medium transition"
            >
              <ArrowLeft className="size-6" />
              Back
            </a>
          </div>
          <div className="">
            <h2 className="text-title-50 mb-4 text-4xl font-semibold">
              Static.run Starter Pack
            </h2>
            <p className="text-text-100 text-base">
              Ideal For Devs and Freelancers
            </p>
            {/* <!-- Coupon Button --> */}
            <div className="my-8 flex flex-col gap-3 sm:flex-row">
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
            {/* <!-- Summary --> */}
            <div>
              <ul className="border-base-50 space-y-3 border-b pb-5">
                <li className="text-text-100 flex justify-between text-base">
                  <span>Subtotal</span>
                  <span className="font-medium">
                    <span className="line-through">$12.00</span> {''}
                    <span>$5.00</span>
                  </span>
                </li>
                <li className="text-text-100 flex justify-between text-base">
                  <span>Vat(10%)</span>
                  <span className="font-medium">$0.50</span>
                </li>
              </ul>
              <div className="text-title-50 flex justify-between py-5 font-semibold">
                <span className="text-title-50 text-lg font-medium">
                  Total payable
                </span>
                <span className="text-title-50 text-lg font-medium">$5.50</span>
              </div>
            </div>
            {/* <!-- Buttons --> */}
            <div className="mb-8 flex gap-5">
              <a
                href="javascript:void(0)"
                className="inline-flex h-15 w-full items-center justify-center rounded-lg bg-gray-800 p-4"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="70"
                  height="34"
                  viewBox="0 0 70 34"
                  fill="none"
                >
                  <g clip-path="url(#clip0_9492_4449)">
                    <path
                      d="M33.0752 17.5634V25.6185H30.4502V5.69727H37.2752C38.9377 5.69727 40.5127 6.30356 41.7377 7.42955C42.9627 8.46892 43.5752 10.028 43.5752 11.6736C43.5752 13.3193 42.9627 14.7918 41.7377 15.9177C40.5127 17.0437 39.0252 17.65 37.2752 17.65L33.0752 17.5634ZM33.0752 8.12246V15.0516H37.4502C38.4127 15.0516 39.3752 14.7051 39.9877 14.0122C41.3877 12.713 41.3877 10.5477 40.0752 9.24845L39.9877 9.16183C39.2877 8.46892 38.4127 8.03585 37.4502 8.12246H33.0752Z"
                      fill="white"
                    />
                    <path
                      d="M49.6127 11.5869C51.5377 11.5869 53.0252 12.1066 54.1627 13.146C55.3002 14.1853 55.8252 15.5712 55.8252 17.3034V25.6184H53.3752V23.7129H53.2877C52.2377 25.272 50.7502 26.0515 49.0002 26.0515C47.5127 26.0515 46.2002 25.6184 45.1502 24.7523C44.1877 23.8861 43.5752 22.6735 43.5752 21.3743C43.5752 19.9885 44.1002 18.8625 45.1502 17.9964C46.2002 17.1302 47.6877 16.7838 49.4377 16.7838C51.0127 16.7838 52.2377 17.0436 53.2002 17.6499V17.0436C53.2002 16.1775 52.8502 15.3113 52.1502 14.7916C51.4502 14.1853 50.5752 13.8389 49.6127 13.8389C48.1252 13.8389 46.9877 14.4452 46.2002 15.6578L43.9252 14.272C45.3252 12.4531 47.1627 11.5869 49.6127 11.5869ZM46.2877 21.4609C46.2877 22.1538 46.6377 22.7601 47.1627 23.1066C47.7752 23.5397 48.4752 23.7995 49.1752 23.7995C50.2252 23.7995 51.2752 23.3664 52.0627 22.5869C52.9377 21.8074 53.3752 20.8546 53.3752 19.8153C52.5877 19.209 51.4502 18.8625 49.9627 18.8625C48.9127 18.8625 48.0377 19.1223 47.3377 19.642C46.6377 20.0751 46.2877 20.6814 46.2877 21.4609Z"
                      fill="white"
                    />
                    <path
                      d="M70.0002 12.0195L61.3377 31.681H58.7127L61.9502 24.8384L56.2627 12.1061H59.0627L63.1752 21.8935H63.2627L67.2877 12.1061H70.0002V12.0195Z"
                      fill="white"
                    />
                    <path
                      d="M22.6623 15.8308C22.6623 15.0512 22.5748 14.2717 22.4873 13.4922H11.5498V17.9095H17.7623C17.4998 19.2953 16.7123 20.5946 15.4873 21.3741V24.2323H19.2498C21.4373 22.2402 22.6623 19.2953 22.6623 15.8308Z"
                      fill="white"
                    />
                    <path
                      d="M11.5501 27.004C14.7001 27.004 17.3251 25.9647 19.2501 24.2324L15.4876 21.3741C14.4376 22.067 13.1251 22.5001 11.5501 22.5001C8.5751 22.5001 5.9501 20.508 5.0751 17.7363H1.2251V20.6812C3.2376 24.5788 7.1751 27.004 11.5501 27.004Z"
                      fill="white"
                    />
                    <path
                      d="M5.0749 17.7362C4.5499 16.3504 4.5499 14.7913 5.0749 13.3189V10.374H1.2249C-0.437598 13.5787 -0.437598 17.3898 1.2249 20.6811L5.0749 17.7362Z"
                      fill="white"
                    />
                    <path
                      d="M11.55 8.64141C13.2125 8.64141 14.7875 9.24771 16.0125 10.3737L19.3375 7.08235C17.2375 5.17684 14.4375 4.05086 11.6375 4.13747C7.2625 4.13747 3.2375 6.56267 1.3125 10.4603L5.1625 13.4052C5.95 10.6335 8.575 8.64141 11.55 8.64141Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_9492_4449">
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
                className="inline-flex h-15 w-full items-center justify-center rounded-lg bg-[#113984] p-4"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="100"
                  height="24"
                  viewBox="0 0 100 24"
                  fill="none"
                >
                  <g clip-path="url(#clip0_9492_4458)">
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M8.72587 5.64941H15.5592C19.228 5.64941 20.6092 7.48938 20.3957 10.1926C20.043 14.6553 17.3195 17.1243 13.7071 17.1243H11.8832C11.3876 17.1243 11.0542 17.4493 10.9201 18.33L10.1458 23.4498C10.0946 23.7818 9.91826 23.974 9.65367 24.0002H5.36037C4.95644 24.0002 4.81357 23.6944 4.9194 23.0322L7.53701 6.6192C7.63932 5.96219 8.00267 5.64941 8.72587 5.64941Z"
                      fill="white"
                      fill-opacity="0.5"
                    />
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M38.393 5.34473C40.6984 5.34473 42.8256 6.58361 42.5346 9.67119C42.1818 13.3407 40.1974 15.3711 37.0665 15.3798H34.3307C33.9374 15.3798 33.7469 15.6978 33.6446 16.3496L33.1154 19.6818C33.036 20.1851 32.775 20.4332 32.3905 20.4332H29.8452C29.4395 20.4332 29.2984 20.1763 29.3883 19.6014L31.4891 6.24637C31.5932 5.58936 31.8419 5.34473 32.2952 5.34473H38.3877H38.393ZM34.2478 12.4949H36.3204C37.6169 12.446 38.4776 11.5566 38.5641 9.95252C38.617 8.96176 37.9414 8.25233 36.8672 8.25757L34.9164 8.26631L34.2478 12.4949ZM49.4543 19.411C49.6871 19.2013 49.9235 19.093 49.89 19.3516L49.8071 19.9701C49.7648 20.2934 49.8935 20.4646 50.1969 20.4646H52.4582C52.8392 20.4646 53.0244 20.3126 53.1179 19.729L54.5114 11.0656C54.5819 10.6305 54.4743 10.4173 54.141 10.4173H51.6539C51.4299 10.4173 51.3205 10.5414 51.2623 10.8804L51.1706 11.4133C51.1229 11.6911 50.9942 11.7401 50.8742 11.4605C50.4527 10.4715 49.3767 10.0277 47.8756 10.0626C44.3884 10.1342 42.0372 12.757 41.7849 16.119C41.5909 18.719 43.4712 20.7617 45.9512 20.7617C47.7504 20.7617 48.5547 20.2375 49.4614 19.4162L49.4543 19.411ZM47.5599 18.0777C46.0588 18.0777 45.0128 16.8913 45.2298 15.4375C45.4468 13.9837 46.8508 12.7972 48.3519 12.7972C49.853 12.7972 50.8989 13.9837 50.682 15.4375C50.465 16.8913 49.0627 18.0777 47.5599 18.0777ZM58.937 10.3894H56.6439C56.1712 10.3894 55.9789 10.7388 56.1289 11.1687L58.9758 19.4267L56.1835 23.3565C55.9489 23.685 56.1306 23.9838 56.4605 23.9838H59.0375C59.1877 24.001 59.3397 23.9751 59.4755 23.9091C59.6112 23.8431 59.7249 23.7399 59.803 23.6116L68.559 11.1704C68.8288 10.7878 68.7019 10.3859 68.2591 10.3859H65.8197C65.4016 10.3859 65.234 10.5501 64.9942 10.8943L61.3429 16.1364L59.7113 10.8821C59.6161 10.5641 59.3779 10.3894 58.9387 10.3894H58.937Z"
                      fill="white"
                    />
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M77.6676 5.3453C79.973 5.3453 82.1002 6.58418 81.8092 9.67176C81.4564 13.3412 79.472 15.3716 76.3411 15.3804H73.6071C73.2138 15.3804 73.0233 15.6984 72.921 16.3502L72.3918 19.6824C72.3124 20.1856 72.0514 20.4338 71.6668 20.4338H69.1215C68.7158 20.4338 68.5747 20.1769 68.6647 19.602L70.769 6.24344C70.8731 5.58643 71.1218 5.3418 71.5751 5.3418H77.6676V5.3453ZM73.5224 12.4955H75.595C76.8915 12.4466 77.7522 11.5572 77.8387 9.95308C77.8916 8.96233 77.216 8.2529 76.1418 8.25814L74.191 8.26688L73.5224 12.4955ZM88.7289 19.4115C88.9618 19.2019 89.1981 19.0935 89.1646 19.3521L89.0817 19.9707C89.0394 20.294 89.1681 20.4652 89.4715 20.4652H91.7328C92.1138 20.4652 92.299 20.3132 92.3925 19.7296L93.786 11.0662C93.8565 10.6311 93.7489 10.4179 93.4156 10.4179H90.932C90.708 10.4179 90.5986 10.5419 90.5404 10.8809L90.4487 11.4139C90.4011 11.6917 90.2723 11.7406 90.1524 11.4611C89.7308 10.4721 88.6548 10.0282 87.1538 10.0632C83.6666 10.1348 81.3153 12.7576 81.0631 16.1195C80.869 18.7196 82.7493 20.7623 85.2294 20.7623C87.0285 20.7623 87.8329 20.2381 88.7395 19.4168L88.7289 19.4115ZM86.8363 18.0783C85.3352 18.0783 84.2892 16.8919 84.5062 15.4381C84.7231 13.9842 86.1272 12.7978 87.6283 12.7978C89.1293 12.7978 90.1753 13.9842 89.9583 15.4381C89.7414 16.8919 88.3373 18.0783 86.8363 18.0783ZM97.2661 20.4792H94.6556C94.6102 20.4812 94.5649 20.4733 94.5229 20.4559C94.481 20.4386 94.4434 20.4123 94.4129 20.3789C94.3824 20.3455 94.3597 20.3059 94.3465 20.2628C94.3333 20.2197 94.3298 20.1743 94.3363 20.1297L96.6294 5.73845C96.6513 5.64023 96.7061 5.55224 96.7848 5.48879C96.8636 5.42534 96.9618 5.39016 97.0633 5.38898H99.6738C99.7192 5.38697 99.7645 5.39491 99.8065 5.41225C99.8484 5.42959 99.886 5.45589 99.9165 5.48927C99.947 5.52266 99.9697 5.5623 99.9829 5.60538C99.9962 5.64845 99.9996 5.69389 99.9931 5.73845L97.7001 20.1297C97.6789 20.2286 97.6244 20.3174 97.5455 20.3815C97.4667 20.4456 97.3681 20.4813 97.2661 20.4827V20.4792Z"
                      fill="white"
                    />
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M4.45223 0H11.2926C13.2187 0 15.5047 0.0611576 17.0322 1.39789C18.0535 2.29079 18.5898 3.71139 18.4663 5.24208C18.0465 10.416 14.9226 13.3149 10.7317 13.3149H7.35911C6.78409 13.3149 6.40485 13.6923 6.24257 14.7128L5.30066 20.6538C5.23893 21.0382 5.07136 21.2654 4.7715 21.2933H0.550524C0.0830944 21.2933 -0.0827122 20.9439 0.0389957 20.1715L3.07288 1.12879C3.19458 0.363449 3.61968 0 4.45223 0Z"
                      fill="white"
                    />
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M6.34131 14.1099L7.53546 6.619C7.63953 5.96199 8.00289 5.64746 8.72608 5.64746H15.5594C16.69 5.64746 17.6055 5.8222 18.3216 6.14546C17.6355 10.7515 14.628 13.3096 10.6911 13.3096H7.32379C6.87224 13.3114 6.54063 13.5351 6.34131 14.1099Z"
                      fill="white"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_9492_4458">
                      <rect width="100" height="24" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </a>
            </div>
            {/* <!-- Or --> */}
            <div className="my-4 flex items-center">
              <div className="bg-background-soft-200 h-px grow"></div>
              <p className="text-text-100 mx-4 text-sm">or pay with</p>
              <div className="bg-background-soft-200 h-px grow"></div>
            </div>
            {/* <!-- Options --> */}
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div
                onClick={() => setSelected('card')}
                className={`ring-background-soft-400 flex cursor-pointer flex-col items-center rounded-lg border-2 p-4 ring-1 ${selected === 'card' ? 'border-primary-500 ring-transparent' : 'border-transparent'}`}
              >
                <div className="text-text-50 bg-background-soft-100 inline-flex h-10 w-10 items-center justify-center rounded-md">
                  <CreditCard className="size-6" />
                </div>
                <h3 className="text-title-50 mt-3.5 text-base">Credit/debit</h3>
              </div>
              <div
                onClick={() => setSelected('bank')}
                className={`ring-background-soft-400 flex cursor-pointer flex-col items-center rounded-lg border-2 p-4 ring-1 ${selected === 'bank' ? 'border-primary-500 ring-transparent' : 'border-transparent'}`}
              >
                <div className="text-text-50 bg-background-soft-100 inline-flex h-10 w-10 items-center justify-center rounded-md">
                  <Bank1 className="size-6" />
                </div>
                <h3 className="text-title-50 mt-3.5 text-base">
                  Bank Transfer
                </h3>
              </div>
              <div
                onClick={() => setSelected('cash')}
                className={`ring-background-soft-400 flex cursor-pointer flex-col items-center rounded-lg border-2 p-4 ring-1 ${selected === 'cash' ? 'border-primary-500 ring-transparent' : 'border-transparent'}`}
              >
                <div className="text-text-50 bg-background-soft-100 inline-flex h-10 w-10 items-center justify-center rounded-md">
                  <svg
                    width="25"
                    height="24"
                    viewBox="0 0 25 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clip-path="url(#clip0_9492_4484)">
                      <path
                        d="M18.333 0H6.33301C3.0193 0 0.333008 2.68629 0.333008 6V18C0.333008 21.3137 3.0193 24 6.33301 24H18.333C21.6467 24 24.333 21.3137 24.333 18V6C24.333 2.68629 21.6467 0 18.333 0Z"
                        fill="url(#paint0_linear_9492_4484)"
                      />
                      <path
                        d="M12.9435 7.94652C14.0985 7.95059 15.2151 8.36166 16.097 9.10752C16.1885 9.19052 16.3082 9.23544 16.4317 9.2331C16.5551 9.23075 16.673 9.18132 16.7612 9.09492L17.6612 8.18052C17.7068 8.1353 17.7427 8.0811 17.7664 8.02137C17.7901 7.96164 17.8012 7.89764 17.7991 7.83341C17.7968 7.76918 17.7814 7.7061 17.7536 7.64813C17.7259 7.59015 17.6864 7.53854 17.6378 7.49652C16.9253 6.89064 16.1018 6.42908 15.2133 6.13752L15.4976 4.79292C15.5119 4.72404 15.5105 4.65288 15.4937 4.58459C15.4769 4.51629 15.4451 4.4526 15.4007 4.39812C15.3562 4.34366 15.3001 4.29978 15.2366 4.26968C15.173 4.23959 15.1036 4.22402 15.0333 4.22412H13.2765C13.1677 4.22405 13.0622 4.26111 12.9774 4.32921C12.8926 4.3973 12.8336 4.49232 12.8103 4.59852L12.5547 5.79372C10.2147 5.90892 8.23466 7.06452 8.23466 9.43332C8.23466 11.4835 9.87086 12.3619 11.6007 12.9703C13.2369 13.5787 14.1009 13.8037 14.1009 14.6605C14.1009 15.5174 13.2369 16.0574 11.9643 16.0574C10.7287 16.0769 9.5351 15.6093 8.64146 14.7559C8.55238 14.6691 8.43289 14.6205 8.30846 14.6205C8.18404 14.6205 8.06455 14.6691 7.97546 14.7559L6.99806 15.71C6.95249 15.7539 6.91625 15.8066 6.8915 15.8649C6.86675 15.9233 6.854 15.9858 6.854 16.0493C6.854 16.1126 6.86675 16.1753 6.8915 16.2335C6.91625 16.2918 6.95249 16.3445 6.99806 16.3886C7.79332 17.1387 8.76548 17.6757 9.82406 17.9492L9.56126 19.2002C9.54704 19.2696 9.54821 19.3413 9.5647 19.4103C9.58117 19.4793 9.61256 19.544 9.65665 19.5995C9.70073 19.6551 9.75644 19.7004 9.81988 19.7321C9.88333 19.7639 9.95294 19.7813 10.0239 19.7834H11.7933C11.9027 19.7846 12.0092 19.748 12.0948 19.6797C12.1804 19.6116 12.2398 19.5159 12.2631 19.409L12.5169 18.2102C15.3123 18.0302 17.0168 16.5344 17.0168 14.3293C17.0168 12.3025 15.3105 11.4493 13.2369 10.7473C12.0543 10.3189 11.0319 10.0273 11.0319 9.14712C11.0319 8.26692 11.9877 7.94652 12.9435 7.94652Z"
                        fill="white"
                      />
                    </g>
                    <defs>
                      <linearGradient
                        id="paint0_linear_9492_4484"
                        x1="0.333008"
                        y1="12"
                        x2="24.333"
                        y2="12"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stop-color="#00C244" />
                        <stop offset="1" stop-color="#00D64B" />
                      </linearGradient>
                      <clipPath id="clip0_9492_4484">
                        <rect
                          width="24"
                          height="24"
                          fill="white"
                          transform="translate(0.333008)"
                        />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <h3 className="text-title-50 mt-3.5 text-base">Cash App</h3>
              </div>
            </div>
            <div className="mt-8">
              <form>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="relative col-span-full">
                    <label className="text-text-50 mb-1.5 block text-sm font-medium">
                      Email Address
                    </label>
                    <Input type="text" placeholder="hello@pimjo.com" />
                  </div>
                  <div className="col-span-full">
                    <label className="text-text-50 mb-1.5 block text-sm font-medium">
                      Name
                    </label>
                    <Input type="text" placeholder="David Watson" />
                  </div>
                  <div className="col-span-full">
                    <label className="text-text-50 mb-1.5 block text-sm font-medium">
                      Card Number
                    </label>
                    <Input type="text" placeholder="4645 75345 4546 1345" />
                  </div>
                  <div className="col-span-1">
                    <label className="text-text-50 mb-1.5 block text-sm font-medium">
                      Expire date
                    </label>
                    <Input type="text" placeholder="04/2026" />
                  </div>
                  <div className="col-span-1">
                    <label className="text-text-50 mb-1.5 block text-sm font-medium">
                      Security Code
                    </label>
                    <Input type="text" placeholder="457" />
                  </div>
                </div>
                <div className="mt-8 flex items-center">
                  <Checkbox
                    type="checkbox"
                    id="checkbox1"
                    label="By completing your order, you agree to our license terms."
                  />
                </div>
                <div className="mt-8">
                  <Button className="h-12 w-full">Subscribe</Button>
                </div>
              </form>
            </div>
            {/* <!-- Features --> */}
            <div className="flex flex-col justify-center gap-2 pt-9 sm:flex-row">
              <div className="bg-background-soft-100 flex shrink-0 items-center gap-2 rounded-lg px-4 py-2">
                <Shield1Check className="text-text-100 size-6" />
                <p className="text-text-100 text-xs font-medium">
                  SSL Encrypted
                </p>
              </div>
              <div className="bg-background-soft-100 flex shrink-0 items-center gap-2 rounded-lg px-4 py-2">
                <RefreshCircle1Clockwise className="text-text-100 size-6" />
                <p className="text-text-100 text-xs font-medium">
                  Money Back Guaranty
                </p>
              </div>
              <div className="bg-background-soft-100 flex shrink-0 items-center gap-2 rounded-lg px-4 py-2">
                <Headphone1Mic className="text-text-100 size-5" />
                <p className="text-text-100 text-xs font-medium">
                  24/7 Support24/7 Support
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
