export default function ImageGallery2() {
  return (
    <section className="bg-background-50 min-h-screen py-20">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        {/* <!-- Second Gallery - Asymmetrical Grid --> */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-12 lg:gap-8">
          {/* <!-- Top row --> */}
          <div className="col-span-12 space-y-5 overflow-hidden rounded-lg sm:col-span-8 lg:space-y-8">
            <div>
              <img
                src="https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-02/Image.jpg"
                alt="Building corner with blue sky"
                className="w-full rounded-lg"
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:gap-8">
              <div>
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-02/Image-1.jpg"
                  alt="Building corner with blue sky"
                  className="w-full rounded-lg"
                />
              </div>
              <div>
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-02/Image-2.jpg"
                  alt="Building corner with blue sky"
                  className="w-full rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="col-span-12 overflow-hidden sm:col-span-4">
            <div className="space-y-5 lg:space-y-8">
              <div>
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-02/Image-3.jpg"
                  alt="Minimalist white interior"
                  className="w-full rounded-lg"
                />
              </div>
              <div>
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-02/Image-4.jpg"
                  alt="Minimalist white interior "
                  className="w-full rounded-lg"
                />
              </div>
              <div>
                <img
                  src="https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-02/Image-5.jpg"
                  alt="Minimalist white interior"
                  className="w-full rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
