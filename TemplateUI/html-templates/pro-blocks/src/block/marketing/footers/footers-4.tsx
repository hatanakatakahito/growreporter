import { Button } from '@/components/core/button';
import { Input } from '@/components/core/input';

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

const socialLinks = [
  { label: 'X(Twitter)', href: 'https://twitter.com' },
  { label: 'LinkedIn', href: 'https://linkedin.com' },
  { label: 'Instagram', href: 'https://instagram.com' },
  { label: 'YouTube', href: 'https://youtube.com' },
];

export default function Footers4() {
  return (
    <footer className="bg-background-50 py-20">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="grid gap-5 lg:grid-cols-12">
          {/* <!-- Top  --> */}
          <div className="bg-background-soft-100 rounded-2xl p-11 lg:col-span-4">
            <div className="mb-8">
              <h3 className="text-title-50 mb-2 text-3xl font-semibold">
                Subscribe to our Newsletter
              </h3>
              <p className="text-text-100">
                Signup for latest news and insights from TailGrids
              </p>
            </div>
            <div>
              <form action="">
                <div className="space-y-3">
                  <Input
                    placeholder="Enter your email address"
                    className="h-11"
                  />
                  <Button className="w-full">Subscribe</Button>
                </div>
              </form>
            </div>
          </div>
          <div className="bg-background-soft-100 rounded-2xl p-11 lg:col-span-8 xl:p-16">
            <div className="grid grid-cols-1 justify-between gap-10 md:grid-cols-3">
              <div>
                <span className="text-text-100 mb-6 block">Company</span>

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
                        <span className="bg-badge-success-background text-badge-success-text inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium">
                          <span className="bg-badge-success-icon-color h-1.5 w-1.5 rounded-full"></span>
                          Hiring
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-text-100 mb-6 block">Resources</span>
                <ul className="space-y-3">
                  {resourceLinks.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-title-50 hover:text-primary-500 text-base font-medium"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-text-100 mb-6 block">Connect</span>
                <ul className="space-y-3">
                  {socialLinks.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-title-50 hover:text-primary-500 text-base font-medium"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          {/* <!-- Bottom --> */}
          <div className="bg-background-soft-100 rounded-2xl px-8 py-6 lg:col-span-full">
            <div className="flex flex-col items-center justify-between gap-5 lg:flex-row">
              <p className="text-text-100 mb-2 text-sm md:mb-0">
                © Copyright 2025 - TailGrids.
              </p>
              <div className="flex flex-wrap items-center justify-center space-x-4">
                <a
                  href="javascript:void(0)"
                  className="text-text-100 hover:text-primary-500 text-sm font-normal"
                >
                  Terms & Conditions
                </a>
                <span className="text-text-100">|</span>
                <a
                  href="javascript:void(0)"
                  className="text-text-100 hover:text-primary-500 text-sm font-normal"
                >
                  Privacy Policy
                </a>
                <span className="text-text-100">|</span>
                <a
                  href="javascript:void(0)"
                  className="text-text-100 hover:text-primary-500 text-sm font-normal"
                >
                  Cookies Settings
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
