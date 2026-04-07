import { Button } from '@/components/core/button';
import { BadgeDecagramPercent, Book4, Search1, User2 } from '@tailgrids/icons';

import Navbar5 from '../navbar/navbar-5';

export default function Hero10() {
  return (
    <div className="bg-background-50 min-h-screen">
      <Navbar5 />
      <section className="bg-background-50 relative mx-auto max-w-[1440px]">
        <div className="px-4 sm:px-6">
          <div
            className="relative rounded-3xl bg-cover bg-no-repeat py-10 sm:py-16 lg:py-40"
            style={{
              backgroundImage:
                "url('https://cdn-tailgrids.b-cdn.net/3.0/marketing/hero/hero-10/imag-1.jpg')",
            }}
          >
            <div className="relative z-20 mx-auto px-5 text-center lg:max-w-[980px]">
              <h1 className="text-white-100 mb-4 text-center text-4xl font-semibold sm:text-6xl lg:px-20">
                Discover the World, One Adventure at a Time.
              </h1>
              <p className="text-white-80 text-center lg:px-48">
                Explore breathtaking destinations, curated experiences, and
                hassle-free travel — all planned by experts who know the road
                less traveled.
              </p>
              <div className="mt-12 w-full justify-center sm:flex">
                <form>
                  <div className="flex gap-3 sm:w-[428px]">
                    <input
                      type="text"
                      className="border-base-200 bg-background-50 placeholder:text-input-placeholder-text w-full rounded-lg border px-4 py-2.5 text-base"
                      placeholder="Search Your Destination"
                    />

                    <Button size="lg" iconOnly className="shrink-0 text-white">
                      <Search1 className="size-6" />
                    </Button>
                  </div>
                </form>
              </div>
              <ul className="mt-5 flex flex-wrap items-center justify-center gap-5 px-5">
                <li className="text-white-80 flex items-center gap-1.5 text-xs">
                  <BadgeDecagramPercent className="text-white-70 size-4" />
                  Book with ease
                </li>
                <li className="text-white-80 flex items-center gap-1.5 text-xs">
                  <User2 className="text-white-70 size-4" />
                  Friendly, fast service
                </li>
                <li className="text-white-80 flex items-center gap-1.5 text-xs">
                  <Book4 className="text-white-70 size-4" />
                  Good Return policy
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
