import { ChevronDown, ChevronRight } from '@tailgrids/icons';
import { useState } from 'react';

const image =
  ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/about/about-05/image-1.jpg';

export default function About5() {
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const accordionItems = [
    {
      title: 'Engaging Content Creation',
      content:
        'Lorem ipsum dolor sit amet consectetur. Risus mattis nam erat suscipit eget',
    },
    {
      title: 'Data-Driven Strategies',
      content:
        'Lorem ipsum dolor sit amet consectetur. Risus mattis nam erat suscipit eget',
    },
    {
      title: 'Community Management',
      content:
        'Lorem ipsum dolor sit amet consectetur. Risus mattis nam erat suscipit eget',
    },
  ];
  return (
    <section className="bg-background-soft-100 py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="bg-background-50 flex flex-col items-center gap-0 rounded-lg lg:flex-row">
          <div className="lg:w-1/2">
            <div className="p-8 sm:p-16">
              <h2 className="text-title-50 mb-4 text-3xl font-semibold sm:text-4xl">
                Driven by Marketing <br />
                Ground in Results
              </h2>
              <p className="text-text-100 text-base">
                Lorem Ipsum is simply dummy text of the printing and typesetting
                industry. Lorem Ipsum has been the industry's standard
              </p>
              <a
                href="javascript:void(0)"
                className="bg-primary-500 mt-9 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-base font-medium text-white"
              >
                Learn More
                <ChevronRight />
              </a>

              <div className="mt-16">
                {accordionItems.map((item, index) => (
                  <div
                    key={index}
                    className="bg-background-soft-100 mb-2 rounded-xl p-5"
                  >
                    <div
                      className="flex cursor-pointer items-center justify-between"
                      onClick={() => toggleAccordion(index)}
                    >
                      <h3 className="text-title-50 font-medium">
                        {item.title}
                      </h3>
                      <ChevronDown
                        className={`text-text-100 transition-transform duration-300 ${
                          activeAccordion === index ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                    {activeAccordion === index && (
                      <div className="pt-0">
                        <p className="text-text-100 mt-3 text-sm">
                          {item.content}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:w-1/2">
            <div className="p-2.5">
              <img
                src={image}
                className="w-full rounded-xl"
                alt="Marketing Visual"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
