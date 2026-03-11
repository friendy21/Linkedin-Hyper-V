export const metadata = {
  title: 'Privacy Policy | RegulateThis',
  description: 'Our privacy practices and policies handling your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8 md:p-12">
        <div className="prose prose-slate prose-lg max-w-none">
          <h1 className="text-4xl font-extrabold text-[#0B1F3B] mb-8">Privacy Policy</h1>
          
          <p className="text-gray-500 text-sm mb-8">Last Updated: March 2026</p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us when you subscribe to our newsletter, request information, or contact us. This may include your name, email address, company name, and any other details you choose to share.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">2. How We Use Your Information</h2>
          <p>
            We use the information we collect to deliver our newsletter, respond to your inquiries, improve our content, and understand how our audience interacts with our platform. We never sell your personal data to third-party data brokers.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">3. Cookies</h2>
          <p>
            We use essential cookies to ensure the basic functionality of the website and analytics cookies to understand how visitors engage with our site. You can control cookie preferences through your browser settings.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">4. Your Rights</h2>
          <p>
            You have the right to access, update, or delete your personal information. If you receive our newsletter and wish to stop, you can click the "unsubscribe" link at the bottom of every email.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">5. Contact</h2>
          <p>
            If you have questions about this privacy policy or our data practices, please contact us at privacy@regulatethis.com.
          </p>
        </div>
      </div>
    </div>
  );
}
