import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - Gather',
  description: 'Privacy Policy for the Gather event platform.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mt-6 mb-4">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: January 17, 2026</p>

        <div className="prose prose-lg max-w-none text-gray-600 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, including:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Account information (email, name, profile details)</li>
              <li>Event information you create or interact with</li>
              <li>Communications you send through the platform</li>
              <li>Usage information and device data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Send you notifications about events and updates</li>
              <li>Respond to your comments and questions</li>
              <li>Protect against fraud and abuse</li>
              <li>Analyze usage and improve user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Information Sharing</h2>
            <p>
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Event organizers for events you RSVP to</li>
              <li>Service providers who assist in operating our platform</li>
              <li>Law enforcement when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Your Privacy Choices</h2>
            <p>You have control over your information:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>
                <strong>Profile Visibility</strong> – You can control what information is visible on
                your profile.
              </li>
              <li>
                <strong>Location</strong> – City-level location is optional and only visible to you
                for personalized recommendations.
              </li>
              <li>
                <strong>Email Preferences</strong> – You can manage email notifications in your
                settings.
              </li>
              <li>
                <strong>Account Deletion</strong> – You can request deletion of your account at any
                time.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your information. However, no
              method of transmission over the internet is 100% secure, and we cannot guarantee
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to maintain your session, remember your
              preferences, and analyze usage patterns. You can control cookie settings in your
              browser.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Children&apos;s Privacy</h2>
            <p>
              Our Service is not intended for children under 13. We do not knowingly collect
              personal information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. International Users</h2>
            <p>
              If you are accessing our Service from outside the United States, please be aware that
              your information may be transferred to and processed in the United States.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new policy on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:privacy@gather.app" className="text-indigo-600 hover:text-indigo-700">
                privacy@gather.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
