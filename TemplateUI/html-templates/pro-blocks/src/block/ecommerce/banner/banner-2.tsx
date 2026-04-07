export default function Banner2() {
  return (
    <section className="bg-background-50 relative p-6">
      <div
        className="bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://cdn-tailgrids.b-cdn.net/3.0/e-commerce/banner/banner-02.jpg')",
        }}
      >
        <div className="absolute inset-6 bg-[rgba(55,88,249,0.8)]"></div>
        <div className="px-5 py-14 lg:p-28">
          {/* <!-- Content --> */}
          <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
            <h2 className="text-white-100 mb-5 text-3xl font-semibold md:text-5xl">
              Flash Sale !
            </h2>
            <p className="text-white-100 relative mb-5 text-2xl font-normal md:text-3xl">
              <span className="bg-background-50 mr-2 inline-block h-px w-10 align-middle"></span>
              Up to
              <span className="bg-background-50 ml-2 inline-block h-px w-10 align-middle"></span>
            </p>
            <h1 className="text-white-100 mb-5 text-7xl font-semibold md:text-9xl">
              50% Off
            </h1>
            <p className="text-white-60 mb-6 text-base">
              Limited-time discounts on selected fashion pieces.
            </p>
            <a
              href="javascript:void(0)"
              className="bg-background-50 text-title-50 hover:bg-background-soft-100 rounded-lg px-5 py-3 font-medium transition"
            >
              Shop the Sale
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
