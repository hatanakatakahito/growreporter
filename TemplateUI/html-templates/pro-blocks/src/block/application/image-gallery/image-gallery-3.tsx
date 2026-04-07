// Keep component simple and implement the 4-column layout for 1-2-2-1

export default function ImageGallery3() {
  // Six images following the 1-2-2-1 column arrangement
  const images = [
    'https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-03/Image-1.jpg', // Column 1 (single)
    'https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-03/Image-2.jpg', // Column 2 (top)
    'https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-03/Image-3.jpg', // Column 2 (bottom)
    'https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-03/Image-4.jpg', // Column 3 (top)
    'https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-03/Image-5.jpg', // Column 3 (bottom)
    'https://cdn-tailgrids.b-cdn.net/3.0/application/gallery/gallery-03/image-6.jpg', // Column 4 (single)
  ];

  return (
    <section className="bg-background-50 min-h-screen py-20">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <div className="mx-auto max-w-[1200px]">
          {/* Desktop layout: 4 equal columns (1, 2, 2, 1). Use flex columns so single items center vertically */}
          <div className="flex w-full flex-col items-center gap-6 md:flex-row">
            {/* Column 1 - single vertically centered */}
            <div className="flex w-full flex-1 items-center justify-center">
              <div className="max-h-[560px] w-full overflow-hidden rounded-lg">
                <img
                  src={images[0]}
                  alt="Gallery image 1"
                  className="w-full object-cover"
                />
              </div>
            </div>

            {/* Column 2 - two stacked, centered */}
            <div className="flex w-full flex-1 flex-col justify-center gap-6">
              <div className="overflow-hidden rounded-lg">
                <img
                  src={images[1]}
                  alt="Gallery image 2"
                  className="w-full object-cover"
                />
              </div>
              <div className="g overflow-hidden">
                <img
                  src={images[2]}
                  alt="Gallery image 3"
                  className="w-full rounded-lg"
                />
              </div>
            </div>

            {/* Column 3 - two stacked, centered */}
            <div className="flex w-full flex-1 flex-col justify-center gap-6">
              <div className="h-1/2 overflow-hidden rounded-lg">
                <img
                  src={images[3]}
                  alt="Gallery image 4"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="h-1/2 overflow-hidden rounded-lg">
                <img
                  src={images[4]}
                  alt="Gallery image 5"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Column 4 - single vertically centered */}
            <div className="flex w-full flex-1 items-center justify-center">
              <div className="w-full overflow-hidden rounded-lg">
                <img
                  src={images[5]}
                  alt="Gallery image 6"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
