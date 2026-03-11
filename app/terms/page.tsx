export const metadata = {
  title: 'Terms of Use | RegulateThis',
  description: 'Terms and conditions for using the RegulateThis platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8 md:p-12">
        <div className="prose prose-slate prose-lg max-w-none">
          <h1 className="text-4xl font-extrabold text-[#0B1F3B] mb-8">Terms of Use</h1>
          
          <p className="text-gray-500 text-sm mb-8">Last Updated: March 2026</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using RegulateThis (the "Platform"), you accept and agree to be bound by the terms and provision of this agreement. In addition, when using this Platform's particular services, you shall be subject to any posted guidelines or rules applicable to such services.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">2. Educational Purpose</h2>
          <p>
            The content provided on this Platform is for informational and educational purposes only. Nothing on this site constitutes professional legal, financial, or regulatory advice. Wealth management professionals and Registered Investment Advisors (RIAs) should consult their own compliance officers or legal counsel before making operational decisions.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">3. Intellectual Property</h2>
          <p>
            The Platform and its original content, features, and functionality are owned by RegulateThis and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">4. Limitation of Liability</h2>
          <p>
            In no event shall RegulateThis, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Platform.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">5. Changes</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Platform after those revisions become effective, you agree to be bound by the revised terms.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">6. Contact</h2>
          <p>
            If you have any questions about these Terms, please contact us at legal@regulatethis.com.
          </p>
        </div>
      </div>
    </div>
  );
}
