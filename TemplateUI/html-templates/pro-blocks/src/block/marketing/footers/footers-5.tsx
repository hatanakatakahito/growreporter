import { Envelope1, MapMarker5, Telephone1 } from '@tailgrids/icons';

const companyLinks = [
  { label: 'About Us', href: '#', badge: false },
  { label: 'Careers', href: '#', badge: true },
  { label: 'Blog', href: '#', badge: false },
  { label: 'Press', href: '#', badge: false },
  { label: 'Contact', href: '#', badge: false },
];

const resourceLinks = [
  { label: 'Guides & Tutorials', href: '#' },
  { label: 'Community Forum', href: '#' },
  { label: 'API Docs', href: '#' },
  { label: 'Webinars', href: '#' },
];

export default function Footers5() {
  return (
    <footer className="bg-background-50 w-full">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid grid-cols-1 gap-8 py-24 md:grid-cols-2 lg:grid-cols-5">
          {/* <!-- Support Column --> */}
          <div className="lg:col-span-2">
            <h3 className="text-text-100 mb-6 text-lg font-medium">Support</h3>

            <div className="space-y-5">
              <div className="flex items-center">
                <div className="border-base-100 text-title-50 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                  <Telephone1 />
                </div>
                <div className="ml-4">
                  <p className="text-title-50">+894 022 0232</p>
                </div>
              </div>

              <div className="flex items-center">
                <div className="border-base-100 text-title-50 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                  <Envelope1 />
                </div>
                <div className="ml-4">
                  <p className="text-title-50">info@gmail.com</p>
                </div>
              </div>

              <div className="flex items-center">
                <div className="border-base-100 text-title-50 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                  <MapMarker5 />
                </div>
                <div className="ml-4">
                  <p className="text-title-50">
                    1234 Innovation Street, Suite 567
                  </p>
                  <p className="text-title-50">New York, US</p>
                </div>
              </div>
            </div>
          </div>

          {/* <!-- Resources Column --> */}
          <div>
            <h3 className="text-text-100 mb-6 text-lg font-medium">
              Resources
            </h3>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.label} className="flex items-center gap-2">
                  <a
                    href={link.href}
                    className="text-title-50 hover:text-primary-500 font-medium"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* <!-- Company Column --> */}
          <div>
            <h3 className="text-text-100 mb-6 text-lg font-medium">Company</h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label} className="flex items-center gap-2">
                  <a
                    href={link.href}
                    className="text-title-50 hover:text-primary-500 font-medium"
                  >
                    {link.label}
                  </a>
                  {link.badge && (
                    <span className="bg-badge-primary-background text-badge-primary-text inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium">
                      <span className="bg-badge-primary-text h-1.5 w-1.5 rounded-full"></span>
                      Hiring
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* <!-- Photo Gallery Column --> */}
          <div>
            <h3 className="text-text-100 mb-6 text-lg font-medium">
              Photo Gallery
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href="javascript:void(0)"
                className="block overflow-hidden rounded-lg"
              >
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/application/footers/footer-05/image-1.jpg"
                  alt="Business meeting"
                  className="h-24 w-full object-cover transition hover:opacity-90"
                />
              </a>
              <a
                href="javascript:void(0)"
                className="block overflow-hidden rounded-lg"
              >
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/application/footers/footer-05/image-2.jpg"
                  alt="Team collaboration"
                  className="h-24 w-full object-cover transition hover:opacity-90"
                />
              </a>
              <a
                href="javascript:void(0)"
                className="block overflow-hidden rounded-lg"
              >
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/application/footers/footer-05/image-3.jpg"
                  alt="Office discussion"
                  className="h-24 w-full object-cover transition hover:opacity-90"
                />
              </a>
              <a
                href="javascript:void(0)"
                className="block overflow-hidden rounded-lg"
              >
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/application/footers/footer-05/image-4.jpg"
                  alt="Team meeting"
                  className="h-24 w-full object-cover transition hover:opacity-90"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-foreground-soft-200 py-6">
        <div className="mx-auto max-w-7xl px-4 xl:px-0">
          <div className="flex flex-col items-center justify-between gap-5 lg:flex-row">
            <p className="text-white-80 mb-2 text-sm md:mb-0">
              © Copyright 2025 - TailGrids.
            </p>
            <div className="flex flex-wrap items-center justify-center space-x-4">
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-white-80 text-sm font-normal"
              >
                Terms & Conditions
              </a>
              <span className="text-white-80">|</span>
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-white-80 text-sm font-normal"
              >
                Privacy Policy
              </a>
              <span className="-80 text-white">|</span>
              <a
                href="javascript:void(0)"
                className="hover:text-primary-500 text-white-80 text-sm font-normal"
              >
                Cookies Settings
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
