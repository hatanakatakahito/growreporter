import { Facebook, Instagram1, Linkedin, Twitter } from '@tailgrids/icons';

const companyLinks = [
  { label: 'About Us', href: '#' },
  { label: 'Careers', href: '#' },
  { label: 'Blog', href: '#' },
  { label: 'Press', href: '#' },
  { label: 'Contact', href: '#' },
];

const resourceLinks = [
  { label: 'Guides & Tutorials', href: '#' },
  { label: 'Case Studies', href: '#' },
  { label: 'Community Forum', href: '#' },
  { label: 'API Docs', href: '#' },
  { label: 'Webinars', href: '#' },
];

const supportLinks = [
  { label: 'Help Center', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Privacy Policy', href: '#' },
  { label: 'FAQs', href: '#' },
  { label: 'Status Page', href: '#' },
];

export default function Footers3() {
  return (
    <footer className="bg-background-50 py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:p-0">
        <div className="flex flex-col md:flex-row">
          {/* <!-- Left Column - Logo and Social --> */}
          <div className="border-base-100 bg-background-50 w-full border-b p-5 pt-10 pb-10 md:w-2/6 lg:border-r lg:border-b-0 lg:px-10 xl:pt-28 xl:pb-16">
            <div className="mb-6">
              <a href="javascript:void(0)">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                  alt=""
                />
              </a>
            </div>
            <p className="text-text-100 text-lg">
              Crafted Tailwind CSS UI Components, Blocks and Templates
            </p>

            <div className="mt-10 xl:mt-24">
              <p className="text-text-100 mb-3 text-sm">Follow us on</p>
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

          {/* <!-- Right Columns - Links --> */}
          <div className="w-full md:w-4/6">
            <div className="bg-background-soft-50 grid grid-cols-1 gap-8 p-5 pt-10 md:grid-cols-3 lg:p-8 xl:p-20 xl:pt-28">
              {/* <!-- Company Links --> */}
              <div>
                <h3 className="text-title-50 mb-4 font-semibold">Company</h3>
                <ul className="space-y-2">
                  {companyLinks.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-text-100 hover:text-primary-500 text-base font-medium"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* <!-- Resources Links --> */}
              <div>
                <h3 className="text-title-50 mb-4 font-semibold">Resources</h3>
                <ul className="space-y-2">
                  {resourceLinks.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-text-100 hover:text-primary-500 text-base font-medium"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* <!-- Support Links --> */}
              <div>
                <h3 className="text-title-50 mb-4 font-semibold">Support</h3>
                <ul className="space-y-2">
                  {supportLinks.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-text-100 hover:text-primary-500 text-base font-medium"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {/* <!-- Bottom Bar --> */}
            <div className="border-base-100 bg-background-50 border-t px-8 py-6 xl:px-20">
              <div className="flex flex-col items-center justify-between gap-4 lg:flex-row">
                <p className="text-text-200 text-sm md:mb-0">
                  &copy; Copyright 2025 - TailGrids. All Rights Reserved
                </p>
                <div className="flex items-center space-x-4">
                  <a
                    href="javascript:void(0)"
                    className="text-text-200 hover:text-primary-500 text-sm"
                  >
                    Terms & Conditions
                  </a>
                  <span className="text-text-200">|</span>
                  <a
                    href="javascript:void(0)"
                    className="text-text-200 hover:text-primary-500 text-sm"
                  >
                    Privacy Policy
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
