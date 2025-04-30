export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            <span className="text-yellow-400">Flash Install</span> for Vercel
          </h1>
          <p className="mt-3 text-xl text-gray-300">
            Accelerate your Vercel builds with faster dependency installation
          </p>
          
          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div className="bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-800 hover:border-yellow-400 transition-colors">
              <h2 className="text-xl font-semibold text-blue-400">Faster Builds</h2>
              <p className="mt-2 text-gray-300">Reduce dependency installation time by up to 50% compared to standard npm install.</p>
            </div>
            
            <div className="bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-800 hover:border-yellow-400 transition-colors">
              <h2 className="text-xl font-semibold text-blue-400">Intelligent Caching</h2>
              <p className="mt-2 text-gray-300">Smart caching ensures consistent, reliable builds and avoids redundant downloads.</p>
            </div>
            
            <div className="bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-800 hover:border-yellow-400 transition-colors">
              <h2 className="text-xl font-semibold text-blue-400">Framework Agnostic</h2>
              <p className="mt-2 text-gray-300">Works with Next.js, Remix, Astro, SvelteKit, and more.</p>
            </div>
            
            <div className="bg-gray-900 rounded-lg shadow-lg p-6 border border-gray-800 hover:border-yellow-400 transition-colors">
              <h2 className="text-xl font-semibold text-blue-400">Zero Configuration</h2>
              <p className="mt-2 text-gray-300">Works out of the box with sensible defaults. No complex setup required.</p>
            </div>
          </div>
          
          <div className="mt-12">
            <a
              href="https://github.com/flash-install-cli/flash-install"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-black bg-yellow-400 hover:bg-yellow-500"
            >
              Learn More on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
