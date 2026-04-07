import { Button } from '@/components/core/button';

const companyLinks = [
  { label: 'About Us', href: '#' },
  { label: 'Careers', href: '#' },
  { label: 'Blog', href: '#' },
  { label: 'Press', href: '#' },
  { label: 'Contact', href: '#' },
];

const supportLinks = [
  { label: 'Help Center', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Privacy Policy', href: '#' },
  { label: 'FAQs', href: '#' },
];

export default function Footers7() {
  return (
    <footer className="bg-background-50 pt-28">
      <div className="mx-auto w-full max-w-7xl px-4 xl:px-0">
        {/* <!-- CTA Banner --> */}
        <div className="to-primary-500 flex flex-col items-center justify-between gap-6 rounded-2xl bg-linear-to-r from-sky-500 p-8 text-white lg:flex-row">
          <div className="flex-1">
            <h2 className="mb-1 text-center text-2xl font-semibold sm:text-3xl lg:text-start">
              Get Started today
            </h2>
            <p className="text-center text-white/80 lg:text-start">
              Access real-time data, updates, and insights anytime, anywhere
            </p>
          </div>
          <div className="flex w-full flex-1 flex-col gap-3 sm:flex-row sm:justify-center lg:justify-end">
            <Button variant="ghost" className="bg-white text-gray-800">
              <a href="javascript:void(0)">Sign in</a>
            </Button>
            <Button
              appearance="outline"
              className="text-white-100 border-base-300 bg-transparent"
            >
              <a href="javascript:void(0)">Contact us</a>
            </Button>
          </div>
        </div>

        {/* <!-- Main Footer --> */}
        <div className="py-18">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
            {/* <!-- Logo and Description --> */}
            <div className="lg:col-span-2 lg:pr-30">
              <a href="javascript:void(0)" className="mb-5 block">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                  alt="logo"
                />
              </a>
              <p className="text-text-100 text-base">
                TailGrids comes with all the essential UI components you need to
                create beautiful websites based on Tailwind CSS.
              </p>
            </div>

            {/* <!-- Company Links --> */}
            <div>
              <h3 className="text-title-50 mb-4 text-xl font-medium">
                Company
              </h3>
              <ul className="space-y-2">
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-text-100 hover:text-primary-500 text-base"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* <!-- Support Links --> */}
            <div>
              <h3 className="text-title-50 mb-4 text-xl font-medium">
                Support
              </h3>
              <ul className="space-y-2">
                {supportLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-text-100 hover:text-primary-500 text-base"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* <!-- Connect Links --> */}
            <div>
              <h3 className="text-title-50 mb-4 text-xl font-medium">
                Connect
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="javascript:void(0)"
                    className="text-text-100 hover:text-primary-500 font-medium"
                  >
                    X(Twitter)
                  </a>
                </li>
                <li>
                  <a
                    href="javascript:void(0)"
                    className="text-text-100 hover:text-primary-500 font-medium"
                  >
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a
                    href="javascript:void(0)"
                    className="text-text-100 hover:text-primary-500 font-medium"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="javascript:void(0)"
                    className="text-text-100 hover:text-primary-500 font-medium"
                  >
                    Facebook
                  </a>
                </li>
                <li>
                  <a
                    href="javascript:void(0)"
                    className="text-text-100 hover:text-primary-500 font-medium"
                  >
                    YouTube
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* <!-- Bottom Bar --> */}
        <div className="border-base-50 border-t py-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-text-100 text-base">
              &copy; Copyright 2025 - TailGrids.
            </p>
            <div className="flex items-center space-x-4">
              <a
                href="javascript:void(0)"
                className="text-text-100 hover:text-primary-500 font-medium"
              >
                Terms & Conditions
              </a>
              <span className="text-text-100">|</span>
              <a
                href="javascript:void(0)"
                className="text-text-100 hover:text-primary-500 font-medium"
              >
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
