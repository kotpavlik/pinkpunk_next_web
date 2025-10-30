export default function Home() {
  return (
    <div className="">
      {/* Main Section */}
      <section className="w-full relative h-screen">
        <video
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          src="/videos/pp_video.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      </section>

    </div>
  )
}