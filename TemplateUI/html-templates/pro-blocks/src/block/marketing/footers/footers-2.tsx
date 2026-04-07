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

export default function Footers2() {
  return (
    <footer>
      <div className="bg-background-50 py-16">
        <div className="mx-auto max-w-7xl px-4 xl:px-0">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-6">
            {/* <!-- Logo and Description --> */}
            <div className="w-full lg:col-span-2">
              <a href="javascript:void(0)" className="mb-6 flex items-center">
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                  alt=""
                />
              </a>
              <p className="text-text-100 mb-5 text-base">
                TailGrids comes with all the essential UI components you need to
                create beautiful websites based on Tailwind CSS.
              </p>
              <div className="bg-badge-success-background inline-flex items-center rounded-full px-2 py-0.5">
                <span className="bg-badge-success-icon-color mr-2 inline-block h-2 w-2 rounded-full"></span>
                <span className="text-badge-success-text text-sm font-medium">
                  All System operational
                </span>
              </div>
            </div>

            {/* <!-- Company Links --> */}
            <div>
              <h3 className="text-title-50 mb-6 text-xl font-medium">
                Company
              </h3>
              <ul className="space-y-3">
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
              <h3 className="text-title-50 mb-6 text-xl font-medium">
                Resources
              </h3>
              <ul className="space-y-3">
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
              <h3 className="text-title-50 mb-6 text-xl font-medium">
                Support
              </h3>
              <ul className="space-y-3">
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

            {/* <!-- Connect Links --> */}
            <div>
              <h3 className="text-title-50 mb-6 text-xl font-medium">
                Connect
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="javascript:void(0)"
                    className="text-text-100 hover:text-primary-500 text-base font-medium"
                  >
                    X(Twitter)
                  </a>
                </li>
                <li>
                  <a
                    href="javascript:void(0)"
                    className="text-text-100 hover:text-primary-500 text-base font-medium"
                  >
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a
                    href="javascript:void(0)"
                    className="text-text-100 hover:text-primary-500 text-base font-medium"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a
                    href="javascript:void(0)"
                    className="text-text-100 hover:text-primary-500 text-base font-medium"
                  >
                    Facebook
                  </a>
                </li>
                <li>
                  <a
                    href="javascript:void(0)"
                    className="text-text-100 hover:text-primary-500 text-base font-medium"
                  >
                    YouTube
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* <!-- Bottom Bar --> */}

      <div className="bg-background-soft-100 py-4">
        <div className="mx-auto max-w-7xl px-4 xl:px-0">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <p className="text-text-100 mb-2 text-sm md:mb-0">
              © Copyright 2025 - TailGrids.
            </p>
            <div className="flex items-center space-x-4">
              <a
                href="javascript:void(0)"
                className="text-text-100 hover:text-primary-500 text-base font-normal"
              >
                Terms & Conditions
              </a>
              <span className="text-text-100">|</span>
              <a
                href="javascript:void(0)"
                className="text-text-100 hover:text-primary-500 text-base font-normal"
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
