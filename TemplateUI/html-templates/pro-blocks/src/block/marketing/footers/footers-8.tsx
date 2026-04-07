import {
  Envelope1,
  Facebook,
  Globe2,
  Instagram1,
  Linkedin,
  MapMarker5,
  Telephone1,
  Twitter,
} from '@tailgrids/icons';

export default function Footers8() {
  return (
    <footer className="bg-background-50 w-full">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="border-base-100 grid grid-cols-1 gap-10 border-b pt-28 pb-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 xl:gap-16">
          <div className="sm:col-span-2">
            <a href="javascript:void(0)" className="mb-6 inline-block">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                alt="logo"
              />
            </a>
            <p className="text-text-100 text-base font-normal">
              TailGrids comes with all the essential UI <br />
              components you need to create beautiful websites <br />
              based on Tailwind CSS.
            </p>
          </div>
          <div>
            <h3 className="text-text-100 mb-6 text-base">Support</h3>
            <div className="space-y-5">
              <div className="flex items-center">
                <div className="text-title-50 flex h-10 w-10 shrink-0 items-center justify-center">
                  <Telephone1 />
                </div>
                <div className="ml-3">
                  <p className="text-title-50 text-base">+894 022 0232</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="text-title-50 flex h-10 w-10 shrink-0 items-center justify-center">
                  <Envelope1 />
                </div>
                <div className="ml-3">
                  <p className="text-title-50 text-base">info@gmail.com</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="text-title-50 flex h-10 w-10 shrink-0 items-center justify-center">
                  <MapMarker5 />
                </div>
                <div className="ml-3">
                  <p className="text-title-50">
                    1234 Innovation Street, Suite 567
                  </p>
                  <p className="text-title-50">New York, US</p>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:flex lg:justify-end">
            <div>
              <h3 className="text-text-100 mb-6 text-base">Company</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="javascript:void(0)"
                    className="text-title-50 hover:text-primary-500 text-base font-medium"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="javascript:void(0)"
                    className="text-title-50 hover:text-primary-500 text-base font-medium"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="javascript:void(0)"
                    className="text-title-50 hover:text-primary-500 text-base font-medium"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="javascript:void(0)"
                    className="text-title-50 hover:text-primary-500 text-base font-medium"
                  >
                    Press
                  </a>
                </li>
                <li>
                  <a
                    href="javascript:void(0)"
                    className="text-title-50 hover:text-primary-500 text-base font-medium"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        {/* <!-- Middle --> */}
        <div className="flex flex-col justify-between gap-5 py-6 sm:items-center sm:px-8 md:flex-row">
          <div className="flex items-center gap-4">
            <a
              href="javascript:void(0)"
              className="hover:text-primary-500 text-text-100 text-base font-normal"
            >
              Terms & Conditions
            </a>
            <span className="text-text-100">|</span>
            <a
              href="javascript:void(0)"
              className="hover:text-primary-500 text-text-100 text-base font-normal"
            >
              Privacy Policy
            </a>
          </div>
          <div className="flex items-center">
            <span className="text-text-100 mr-4 text-base">Follow us on</span>
            <div className="flex space-x-4">
              <a
                href="javascript:void(0)"
                className="text-text-100 hover:text-title-50"
              >
                <Facebook className="size-5" />
              </a>
              <a
                href="javascript:void(0)"
                className="text-text-100 hover:text-title-50"
              >
                <Twitter className="size-5" />
              </a>
              <a
                href="javascript:void(0)"
                className="text-text-100 hover:text-title-50"
              >
                <Instagram1 className="size-5" />
              </a>
              <a
                href="javascript:void(0)"
                className="text-text-100 hover:text-title-50"
              >
                <Linkedin className="size-5" />
              </a>
            </div>
          </div>
        </div>
        {/* <!-- Bottom  --> */}
        <div className="flex flex-col justify-between gap-5 py-6 sm:flex-row sm:px-8">
          <div className="sm:max-w-md">
            <p className="text-title-50 text-base">
              Lorem ipsum dolor sit amet consectetur. Mi justo arcu pulvinar
              mus. Vel nunc in velit iaculis eu. Id vivamus
            </p>
          </div>
          <div className="relative inline-block h-11 w-33">
            {/* <!-- Language Select --> */}
            <select className="border-base-100 text-title-50 w-full appearance-none rounded-lg border bg-transparent py-2 pr-4 pl-10 focus:ring-0 focus:outline-0">
              <option value="eng">English</option>
              <option value="bn">Bangla</option>
              <option value="cn">Chinese</option>
            </select>
            {/* <!-- Globe Icon --> */}
            <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
              <Globe2 />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
