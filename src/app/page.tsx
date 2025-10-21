export default function Home() {
  return (
    <div className="">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-6xl sm:text-8xl font-bold text-white mb-8 drop-shadow-2xl">
            <span className="text-[#ff2b9c]">Pink</span> <span className="text-white">Punk</span>
          </h1>
          <p className="text-xl sm:text-2xl text-white/90 mb-12 max-w-2xl mx-auto drop-shadow-lg">
            Your next generation web experience
          </p>
          <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white px-12 py-4 rounded-full text-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105">
            Get Started
          </button>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="min-h-screen flex items-center justify-center px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20 shadow-2xl">
            <h2 className="text-5xl font-bold text-white mb-8 text-center">About Us</h2>
            <p className="text-xl text-white/90 mb-6 leading-relaxed">
              Pink Punk is a revolutionary platform that combines cutting-edge technology with stunning design.
              We believe in creating experiences that are both beautiful and functional.
            </p>
            <p className="text-xl text-white/90 leading-relaxed">
              Our mission is to push the boundaries of what&apos;s possible on the web, delivering solutions
              that inspire and empower users around the world.
            </p>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="min-h-screen flex items-center justify-center px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-white mb-16 text-center">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-2xl font-bold text-white mb-4">Design</h3>
              <p className="text-white/80">
                Beautiful, modern designs that capture attention and deliver results.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold text-white mb-4">Development</h3>
              <p className="text-white/80">
                Fast, scalable applications built with the latest technologies.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-white mb-4">Launch</h3>
              <p className="text-white/80">
                From concept to deployment, we handle everything you need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="min-h-screen flex items-center justify-center px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-5xl font-bold text-white mb-16 text-center">Why Choose Us</h2>
          <div className="space-y-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 flex items-start gap-6">
              <div className="text-3xl">✨</div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">Modern Stack</h3>
                <p className="text-white/80 text-lg">Built with Next.js, React, and Tailwind CSS for optimal performance.</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 flex items-start gap-6">
              <div className="text-3xl">🎯</div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">User-Focused</h3>
                <p className="text-white/80 text-lg">Every decision is made with the end user in mind.</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 flex items-start gap-6">
              <div className="text-3xl">🔒</div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">Secure</h3>
                <p className="text-white/80 text-lg">Industry-standard security practices to keep your data safe.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="min-h-screen flex items-center justify-center px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-white mb-8">Get In Touch</h2>
          <p className="text-xl text-white/90 mb-12">
            Ready to start your next project? Let&apos;s make something amazing together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white px-10 py-4 rounded-full text-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105">
              Contact Us
            </button>
            <button className="bg-white hover:bg-white/90 text-purple-600 px-10 py-4 rounded-full text-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105">
              Learn More
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}