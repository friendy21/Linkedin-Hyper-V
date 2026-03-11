export const metadata = {
  title: 'About | RegulateThis',
  description: 'About RegulateThis and our mission to provide the best wealth management insights.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-[#0B1F3B] text-white py-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Insights for Modern RIAs
          </h1>
          <p className="text-xl md:text-2xl font-light text-gray-300 max-w-3xl">
            We exist to help wealth management professionals navigate a fast-evolving landscape with clarity, conviction, and operational excellence.
          </p>
        </div>
      </section>

      {/* Body Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-[#0B1F3B] mb-6">Our Mission</h2>
        <p className="text-lg text-gray-700 leading-relaxed mb-10">
          RegulateThis is dedicated to cutting through the noise within the wealth management industry. We provide authoritative breakdowns of the trends, tools, and regulations that actually impact your practice. Built for independent RIAs and financial professionals who refuse to settle for the status quo.
        </p>

        <h3 className="text-2xl font-bold text-[#49648C] mb-6">Core Coverage Areas</h3>
        <ul className="space-y-6">
          <li className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#49648C] flex items-center justify-center mt-1">
              <span className="text-white text-xs">✓</span>
            </div>
            <div className="ml-4">
              <h4 className="text-xl font-semibold text-gray-900">Compliance</h4>
              <p className="text-gray-600 mt-1">Translating SEC rules and regulatory changes into actionable operational guidance.</p>
            </div>
          </li>
          <li className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#49648C] flex items-center justify-center mt-1">
              <span className="text-white text-xs">✓</span>
            </div>
            <div className="ml-4">
              <h4 className="text-xl font-semibold text-gray-900">Practice Management</h4>
              <p className="text-gray-600 mt-1">Strategies for scaling your firm, optimizing talent, and structuring compensation for long-term success.</p>
            </div>
          </li>
          <li className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#49648C] flex items-center justify-center mt-1">
              <span className="text-white text-xs">✓</span>
            </div>
            <div className="ml-4">
              <h4 className="text-xl font-semibold text-gray-900">Technology</h4>
              <p className="text-gray-600 mt-1">Candid platform reviews and integration analysis that goes far beyond sales brochures.</p>
            </div>
          </li>
          <li className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#49648C] flex items-center justify-center mt-1">
              <span className="text-white text-xs">✓</span>
            </div>
            <div className="ml-4">
              <h4 className="text-xl font-semibold text-gray-900">Industry Insights</h4>
              <p className="text-gray-600 mt-1">Deep dives into M&amp;A trends, demographic shifts, and the macro forces reshaping wealth management.</p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}
