const photoProjects = [
  [
    {
      title: 'Golden Hour – Street Portraits',
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-02/Image.jpg',
      description:
        'Lorem ipsum dolor sit amet consectetur. Sed erat egestas et mattis Lorem ipsum dolor sit amet consectetur. Sed erat egestas et mattis',
    },
    {
      title: 'Urban Life – People in Motion',
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-02/Image-1.jpg',
      description:
        'Lorem ipsum dolor sit amet consectetur. Sed erat egestas et mattis Lorem ipsum dolor sit amet consectetur. Sed erat egestas et mattis',
    },
  ],
  [
    {
      title: 'Waves & Solitude – Seascape Series',
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-02/Image-2.jpg',
      description:
        'Lorem ipsum dolor sit amet consectetur. Sed erat egestas et mattis Lorem ipsum dolor sit amet consectetur. Sed erat egestas et mattis',
    },
    {
      title: 'Wedding Moments – Full Coverage',
      image:
        ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/portfolio/portfolio-02/Image-3.jpg',
      description:
        'Lorem ipsum dolor sit amet consectetur. Sed erat egestas et mattis Lorem ipsum dolor sit amet consectetur. Sed erat egestas et mattis',
    },
  ],
];

const PhotoArticle = ({ image, title, description }: any) => (
  <article>
    <img src={image} alt={title} className="mb-6 block w-full rounded-2xl" />
    <h3 className="text-title-50 mb-2 text-2xl font-medium">
      <a href="javascript:void(0)">{title}</a>
    </h3>
    <p className="text-text-100 text-base">{description}</p>
  </article>
);

export default function Portfolio2() {
  return (
    <section className="bg-background-50 py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Featured Work
          </span>
          <h2 className="text-title-50 mb-4 text-center text-4xl font-semibold sm:text-5xl">
            Live Where Life Happens
          </h2>
          <p className="text-text-100 px-5 text-center text-base sm:px-24">
            There are many variations of available but the majority have
            suffered alteration in some form.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-8">
          {photoProjects.map((column, index) => (
            <div key={index} className="space-y-5 lg:space-y-8">
              {column.map((item, i) => (
                <PhotoArticle key={i} {...item} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
