import {
  ChevronDown,
  Code1,
  Layout14,
  LifeGuardTube2,
  MenuHamburger1,
  Message1,
  Pencil1,
  Play,
  UserMultiple1,
  Xmark2x,
} from '@tailgrids/icons';
import { useState } from 'react';

// Navigation links data
const navLinks = [
  { label: 'Home', href: 'javascript:void(0);' },
  { label: 'Features', href: 'javascript:void(0);' },
  { label: 'Pricing', href: 'javascript:void(0);' },
];

// Mega menu items organized by column
const megaMenuItems = {
  leftColumn: [
    {
      icon: Layout14,
      title: 'Templates',
      description: 'Website templates for any use cases.',
    },
    {
      icon: Code1,
      title: 'Developer',
      description: 'Expert Developer for web and mobile solutions.',
    },
    {
      icon: Message1,
      title: 'Customer stories',
      description: 'Join 100+ satisfied clients and elevate your business.',
    },
  ],
  middleColumn: [
    {
      icon: Pencil1,
      title: 'Blog',
      description: 'Stay ahead with expert insights, industry trends.',
    },
    {
      icon: UserMultiple1,
      title: 'Community',
      description:
        'Group of people connected by shared interests, values, or location.',
    },
    {
      icon: LifeGuardTube2,
      title: 'Support',
      description: 'Support means help, assistance, or encouragement.',
    },
  ],
  featuredCard: {
    image: 'https://cdn-tailgrids.b-cdn.net/3.0/application/mega-menu/men.jpg',
    alt: 'person',
    buttonText: 'Play Video',
  },
};

// Mobile navigation links (same as desktop + Contact)
const mobileNavLinks = [
  { label: 'Home', href: 'javascript:void(0);' },
  { label: 'Features', href: 'javascript:void(0);' },
  { label: 'Pricing', href: 'javascript:void(0);' },
];

export default function Navbar4() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);

  return (
    <nav className="bg-background-50 py-6 shadow-sm lg:py-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <a href="javascript:void(0);">
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/logo/tailgrids-logo.svg"
                alt=""
              />
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="bg-background-soft-100 text-text-50 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg focus:outline-none lg:hidden"
          >
            {mobileMenuOpen ? <Xmark2x /> : <MenuHamburger1 />}
          </button>

          {/* Desktop Navigation */}
          <div className="hidden items-center justify-center lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-primary-500 text-text-50 px-3.5 py-8 text-sm font-medium transition-colors"
              >
                {link.label}
              </a>
            ))}

            {/* Essentials with Dropdown */}
            <div
              className="group/nav cursor-pointer px-3.5 py-8"
              onMouseEnter={() => setMegaMenuOpen(true)}
              onMouseLeave={() => setMegaMenuOpen(false)}
            >
              <span className="text-text-50 group-hover/nav:text-primary-500 inline-flex items-center text-sm font-medium transition-colors">
                Essentials
                <ChevronDown
                  className={`ml-1 size-5 transition-transform duration-200 ${megaMenuOpen ? 'rotate-180' : ''}`}
                />
              </span>

              {/* Mega Menu */}
              {megaMenuOpen && (
                <div className="border-base-50 bg-background-50 absolute right-0 z-10 mt-8 w-full max-w-full rounded-xl border shadow-lg">
                  <div className="grid grid-cols-1 p-3 lg:grid-cols-3">
                    {/* Left Column */}
                    <div className="border-base-100 space-y-1 border-b pb-3 lg:border-r lg:border-b-0 lg:pr-3 lg:pb-0">
                      {megaMenuItems.leftColumn.map((item) => (
                        <a
                          href="javascript:void(0);"
                          key={item.title}
                          className="hover:bg-background-soft-50 group flex cursor-pointer items-start rounded-lg p-4 transition"
                        >
                          <div className="text-text-50 group-hover:text-primary-500 shrink-0 transition-colors">
                            <item.icon className="size-6" />
                          </div>
                          <div className="ml-4">
                            <p className="text-text-50 text-base font-medium">
                              {item.title}
                            </p>
                            <p className="text-text-100 mt-1 text-sm">
                              {item.description}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>

                    {/* Middle Column */}
                    <div className="space-y-1 py-3 lg:py-0 lg:pl-3">
                      {megaMenuItems.middleColumn.map((item) => (
                        <a
                          href="javascript:void(0);"
                          key={item.title}
                          className="hover:bg-background-soft-50 group flex cursor-pointer items-start rounded-lg p-4 transition"
                        >
                          <div className="text-text-50 group-hover:text-primary-500 shrink-0 transition-colors">
                            <item.icon className="size-6" />
                          </div>
                          <div className="ml-4">
                            <p className="text-text-50 text-base font-medium">
                              {item.title}
                            </p>
                            <p className="text-text-100 mt-1 text-sm">
                              {item.description}
                            </p>
                          </div>
                        </a>
                      ))}
                    </div>

                    {/* Right Column - Featured Card */}
                    <div className="pl-3">
                      <div className="relative">
                        <img
                          src={megaMenuItems.featuredCard.image}
                          className="h-fll h-[276px] w-full rounded-lg object-cover"
                          alt={megaMenuItems.featuredCard.alt}
                        />
                        <a
                          href="javascript:void(0);"
                          className="bg-background-50/50 hover:bg-background-50 text-title-50 absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-medium transition"
                        >
                          <Play className="fill-foreground-soft-500 h-6 w-6" />
                          {megaMenuItems.featuredCard.buttonText}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <a
              href="javascript:void(0);"
              className="hover:text-primary-500 text-text-50 px-3.5 py-8 text-sm font-medium transition-colors"
            >
              Pricing
            </a>
          </div>

          {/* Desktop Right side items */}
          <div className="hidden items-center space-x-3 lg:flex">
            <a
              href="javascript:void(0);"
              className="border-base-100 bg-background-50 text-text-50 hover:bg-background-soft-100 inline-flex cursor-pointer items-center justify-center rounded-lg border px-3.5 py-2.5 text-sm leading-5 font-medium transition focus:ring-3"
            >
              Sign in
            </a>
            <a
              href="javascript:void(0);"
              className="focus:ring-primary-500/20 bg-primary-500 hover:bg-primary-600 inline-flex cursor-pointer items-center justify-center rounded-lg px-3.5 py-2.5 text-sm leading-5 font-medium text-white transition focus:ring-3"
            >
              Sign up
            </a>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="bg-background-50 mt-5 space-y-1 rounded-xl px-2 pt-2 pb-3">
            {mobileNavLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:bg-background-soft-100 text-text-50 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
              >
                {link.label}
              </a>
            ))}

            {/* Mobile Shop Dropdown */}
            <div>
              <button
                onClick={() => setShopOpen(!shopOpen)}
                className={`hover:bg-background-soft-100 text-text-50 inline-flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-base font-medium ${shopOpen ? 'text-primary-500' : ''}`}
              >
                Essentials
                <ChevronDown
                  className={`size-5 transition-transform ${shopOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {shopOpen && (
                <div className="mt-1 space-y-1 rounded-lg">
                  {[
                    ...megaMenuItems.leftColumn,
                    ...megaMenuItems.middleColumn,
                  ].map((item) => (
                    <a
                      key={item.title}
                      href="javascript:void(0);"
                      className="hover:bg-background-soft-50 group flex cursor-pointer items-start rounded-lg p-4 transition"
                    >
                      <div className="text-text-50 group-hover:text-primary-500 shrink-0 transition-colors">
                        <item.icon className="size-6" />
                      </div>
                      <div className="ml-4">
                        <p className="text-text-50 text-base font-medium">
                          {item.title}
                        </p>
                        <p className="text-text-100 mt-1 text-sm">
                          {item.description}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <a
              href="javascript:void(0);"
              className="hover:bg-background-soft-100 text-text-50 block w-full rounded-lg px-3 py-2 text-left text-base font-medium"
            >
              Contact
            </a>
          </div>
          <div className="border-base-100 flex flex-col gap-3 border-t px-4 pt-5 lg:hidden">
            <a
              href="javascript:void(0);"
              className="bg-background-50 text-text-50 hover:bg-background-soft-100 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-lg border px-3.5 py-2.5 text-sm leading-5 font-medium transition focus:ring-3"
            >
              Sign in
            </a>
            <a
              href="javascript:void(0);"
              className="focus:ring-primary-500/20 bg-primary-500 hover:bg-primary-600 text-white-100 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-lg px-3.5 py-2.5 text-sm leading-5 font-medium transition focus:ring-3"
            >
              Sign up
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
