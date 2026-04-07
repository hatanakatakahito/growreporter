import { AvatarGroup } from '@/components/core/avatar';
import { HalfStarIcon, StarIcon } from '@tailgrids/icons';

const image =
  'https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-06/image.jpg';
const avatar1 =
  'https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-06/Avatar.png';
const avatar2 =
  'https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-06/Avatar-2.png';
const avatar3 =
  'https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-06/Avatar-3.png';

export default function About6() {
  return (
    <section className="bg-background-soft-100 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-11 max-w-2xl text-left sm:mb-16">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            About us
          </span>
          <h2 className="text-title-50 mb-4 text-left text-4xl font-semibold sm:text-5xl">
            We build with purpose
          </h2>
          <p className="text-text-100 text-left text-base">
            Lorem Ipsum is simply dummy text of the printing and typesetting
            industry. Lorem Ipsum has been the industry's standard dummy text
          </p>
        </div>
        <div className="bg-background-50 flex flex-col items-center gap-14 rounded-3xl p-4 lg:flex-row">
          <div className="lg:w-1/2">
            <div>
              <img src={image} className="w-full rounded-xl" alt="" />
            </div>
          </div>
          <div className="lg:w-1/2">
            <div>
              <div className="mb-7 grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div>
                  <span className="text-title-50 mb-1 block text-4xl sm:text-5xl">
                    2M
                  </span>
                  <span className="text-text-100 block text-base font-normal">
                    Products Sold
                  </span>
                </div>
                <div>
                  <span className="text-title-50 mb-1 block text-4xl sm:text-5xl">
                    98%
                  </span>
                  <span className="text-text-100 block text-base font-normal">
                    Customer Satisfaction
                  </span>
                </div>
                <div>
                  <span className="text-title-50 mb-1 block text-4xl sm:text-5xl">
                    150+
                  </span>
                  <span className="text-text-100 block text-base font-normal">
                    Project Complted
                  </span>
                </div>
              </div>
              <p className="text-text-100 max-w-lg text-base">
                TailGrids is a comprehensive collection of pre-built UI
                components and templates, built on top of Tailwind CSS.
              </p>
              <div className="mt-10 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex -space-x-3">
                  <AvatarGroup
                    data={[
                      { src: avatar1, alt: 'Team member 1' },
                      { src: avatar2, alt: 'Team member 2' },
                      { src: avatar3, alt: 'Team member 3' },
                    ]}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex">
                    <StarIcon className="size-4 text-yellow-500" />
                    <StarIcon className="size-4 text-yellow-500" />
                    <StarIcon className="size-4 text-yellow-500" />
                    <StarIcon className="size-4 text-yellow-500" />
                    <HalfStarIcon className="size-4 text-yellow-500" />
                  </div>
                  <p>3.5 star product review</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
