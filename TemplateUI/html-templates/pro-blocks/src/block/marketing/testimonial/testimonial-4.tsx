const testimonials = [
  {
    name: 'Kathryn Murphy',
    handle: '@kath5',
    role: 'Developer',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-04/avatar-1.png',
    text: '"Working with this team has been a game-changer — their attention to detail, creativity, and commitment to deadlines exceeded every expectation I had."',
  },
  {
    name: 'Monica Reyes',
    handle: '@moniys',
    role: 'Marketing Director',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-04/avatar-2.png',
    text: '"We’ve worked with many agencies, but very few deliver like this team. Professional, transparent, and deeply skilled—every deadline was hit, every requirement met."',
  },
  {
    name: 'Wade Warren',
    handle: '@wadeui',
    role: 'Ui Designer',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-04/avatar-3.png',
    text: '"Their design thinking and attention to detail brought our product to life. The process felt seamless from start to finish."',
  },
  {
    name: 'Anna Peterson',
    handle: '@anaapet',
    role: 'Founder',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-04/avatar-3.png',
    text: '"Their design thinking and attention to detail brought our product to life. The process felt seamless from start to finish."',
  },
  {
    name: 'Sara Kim',
    handle: '@sarakims',
    role: 'Co-Founder',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-04/avatar-4.png',
    text: '"Clean code, intuitive UX, and great communication—exactly what we needed for our SaaS launch. Highly recommend the team!"',
  },
  {
    name: 'Daniel Kim',
    handle: '@danixx',
    role: 'Product Manager',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-04/avatar-5.png',
    text: '"We’ve worked with many agencies, but very few deliver like this team. The designs were clean, modern, and exactly what we needed to refresh our internal tools. We’ll definitely be working together again."',
  },
  {
    name: 'James Liu',
    handle: '@liua',
    role: 'Developer',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-04/avatar-6.png',
    text: '"We needed a design partner who could move fast, think strategically, and deliver pixel-perfect designs. This team, challenged assumptions, and helped us reimagine our entire pixel-perfect dashboard UX."',
  },
  {
    name: 'Nina Alvarez',
    handle: '@ninaal',
    role: 'Brand Consultant',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-04/avatar-7.png',
    text: '"Their design thinking and attention to detail brought our product to life. The process felt seamless from start to finish."',
  },
  {
    name: 'Emily Ross',
    handle: '@emilyrose',
    role: 'CPO',
    image:
      ' https://cdn-tailgrids.b-cdn.net/3.0/marketing/testimonials/testimonial-04/avatar-8.png',
    text: '"Their design thinking and attention to detail brought our product to life. The process felt seamless from start to finish."',
  },
];

export default function Testimonial4() {
  return (
    <section className="bg-background-soft-100 py-14 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mb-16 max-w-md">
          <span className="bg-primary-500/5 text-primary-500 mb-3 inline-block rounded-lg px-3.5 py-1 text-base font-medium">
            Testimonial
          </span>
          <h2 className="text-title-50 mb-4 text-4xl font-semibold sm:text-5xl">
            Hear from Our Happy Customers
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((col) => (
            <div className="space-y-4" key={col}>
              {testimonials.slice(col * 3, col * 3 + 3).map((t) => (
                <article
                  key={t.name}
                  className="bg-background-50 rounded-2xl p-7"
                >
                  <div className="border-base-50 flex justify-between border-b pb-5">
                    <div className="flex items-center gap-3">
                      <img
                        src={t.image}
                        className="h-10 w-10 shrink-0 rounded-full"
                        alt={t.name}
                      />
                      <div>
                        <h3 className="text-text-50 text-sm font-semibold">
                          {t.name}
                        </h3>
                        <span className="text-text-100 text-sm">
                          {t.handle}
                        </span>
                      </div>
                    </div>
                    <span className="bg-background-soft-100 text-text-50 inline-flex h-6 items-center justify-center rounded-full px-2.5 py-1 text-sm font-medium">
                      {t.role}
                    </span>
                  </div>
                  <p className="text-text-100 pt-5">{t.text}</p>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
