import { AvatarGroup } from '@/components/core/avatar';
import { StarIcon } from '@tailgrids/icons';

const image =
  'https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-08/image-1.jpg';
const avatarOne =
  'https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-08/Avatar.png';
const avatarTwo =
  'https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-08/Avatar-2.png';
const avatarThree =
  'https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-08/Avatar-3.png';

export default function About8() {
  return (
    <section className="bg-background-50 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-11 max-w-2xl text-center sm:mb-16">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            About us
          </span>
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            We build with purpose
          </h2>
          <p className="text-text-100 text-center text-base lg:px-5">
            Lorem Ipsum is simply dummy text of the printing and typesetting
            industry. Lorem Ipsum has been the industry's standard dummy text
          </p>
        </div>
        <div className="flex flex-col items-center gap-12 lg:flex-row">
          <div className="lg:w-1/2">
            <div className="relative">
              <img src={image} className="w-full rounded-2xl" alt="" />
              <div className="bg-background-50/90 absolute right-3 bottom-3 left-3 rounded-xl p-7 backdrop-blur-sm">
                <blockquote className="text-text-50 text-xl">
                  <i className="text-title-50 font-semibold">
                    UI Designer & Front-End Developer {''}
                  </i>
                  crafting clean, intuitive, and responsive digital experiences.
                </blockquote>
                <div className="mt-7 flex items-center gap-2">
                  <div className="flex -space-x-3">
                    <AvatarGroup
                      data={[
                        { src: avatarOne, alt: 'Team member 1' },
                        { src: avatarTwo, alt: 'Team member 2' },
                        { src: avatarThree, alt: 'Team member 3' },
                      ]}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <StarIcon className="size-4 text-yellow-500" />
                    <p className="text-text-50 text-base font-medium">
                      4.8 star product review
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:w-1/2">
            <div className="divide-base-200 divide-y px-4 sm:px-7">
              <div className="py-7">
                <h3 className="text-title-50 mb-4 text-3xl font-medium">
                  Branding & Identity
                </h3>
                <p className="text-text-100 text-base">
                  Lorem Ipsum is simply dummy text of the printing and
                  typesetting industry. Lorem Ipsum has been
                </p>
              </div>
              <div className="py-7">
                <h3 className="text-title-50 mb-4 text-3xl font-medium">
                  UI/UX Design
                </h3>
                <p className="text-text-100 text-base">
                  Lorem Ipsum is simply dummy text of the printing and
                  typesetting industry. Lorem Ipsum has been
                </p>
              </div>
              <div className="py-7">
                <h3 className="text-title-50 mb-4 text-3xl font-medium">
                  Website Design
                </h3>
                <p className="text-text-100 text-base">
                  Lorem Ipsum is simply dummy text of the printing and
                  typesetting industry. Lorem Ipsum has been
                </p>
              </div>
              <div className="py-7">
                <h3 className="text-title-50 mb-4 text-3xl font-medium">
                  Creative Strategy
                </h3>
                <p className="text-text-100 text-base">
                  Lorem Ipsum is simply dummy text of the printing and
                  typesetting industry. Lorem Ipsum has been
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
