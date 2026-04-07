export default function ImageGallery1() {
  return (
    <section className="bg-background-50 min-h-screen py-20">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        {/* <!-- Image Grid --> */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* <!-- Top Row --> */}
          <div className="overflow-hidden rounded-lg">
            <img
              src="https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-01/Image.jpg"
              alt="Building corner with blue sky"
              className="w-full object-cover"
            />
          </div>
          <div className="overflow-hidden rounded-lg">
            <img
              src="https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-01/Image-1.jpg"
              alt="Minimalist white interior"
              className="w-full object-cover"
            />
          </div>
          <div className="overflow-hidden rounded-lg">
            <img
              src="https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-01/Image-2.jpg"
              alt="White architectural element"
              className="w-full object-cover"
            />
          </div>

          {/* <!-- Bottom Row --> */}
          <div className="overflow-hidden rounded-lg">
            <img
              src="https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-01/Image-3.jpg"
              alt="White building with clouds"
              className="w-full object-cover"
            />
          </div>
          <div className="overflow-hidden rounded-lg">
            <img
              src="https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-01/Image-4.jpg"
              alt="Mountain with blue sky"
              className="w-full object-cover"
            />
          </div>
          <div className="overflow-hidden rounded-lg">
            <img
              src="https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-01/Image-5.jpg"
              alt="Yellow architectural element"
              className="w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
