import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Help Center - Gather',
  description: 'Get help with Gather - FAQs and support resources.',
};

const faqs = [
  {
    question: 'How do I create an event?',
    answer:
      'Click the "Create Event" button in the navigation bar. Fill in your event details including title, date, time, and location. You can save as a draft or publish immediately.',
  },
  {
    question: 'How do I invite people to my event?',
    answer:
      'From your event page, click "Invite" to send invitations via email. You can also share the event link directly. For private events, only invited users can view the event details.',
  },
  {
    question: 'Can I make my event private?',
    answer:
      'Yes! When creating or editing an event, set the privacy to "Private". Private events are only visible to you, your co-hosts, and people you invite.',
  },
  {
    question: 'How do I RSVP to an event?',
    answer:
      'Visit the event page and click "Going", "Maybe", or "Not Going" to set your RSVP status. For events that require approval, the organizer will review your RSVP.',
  },
  {
    question: 'How do I add an event to my calendar?',
    answer:
      'On the event page, click "Add to Calendar" to download an ICS file or connect directly to Google Calendar. Your RSVP will sync with your preferred calendar.',
  },
  {
    question: 'Can I edit or cancel my event?',
    answer:
      'Yes, event organizers can edit or cancel events at any time from the event management page. Attendees will be notified of any changes.',
  },
  {
    question: 'How do I update my profile?',
    answer:
      'Go to Settings from your user menu to update your display name, bio, avatar, and other profile information.',
  },
  {
    question: 'Is my location shared with others?',
    answer:
      'Your city location (if set) is only used to personalize your event recommendations. It is not shared publicly or with event organizers.',
  },
  {
    question: 'How do I delete my account?',
    answer:
      'Contact us at support@gather.app to request account deletion. We will process your request and delete your data within 30 days.',
  },
  {
    question: 'Who can see my RSVP?',
    answer:
      'By default, event organizers and other attendees can see your RSVP if the guest list is visible. Organizers can choose to hide the guest list.',
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mt-6 mb-4">Help Center</h1>
        <p className="text-gray-600 mb-8">
          Find answers to common questions about using Gather.
        </p>

        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <details
                  key={index}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 group"
                >
                  <summary className="px-6 py-4 cursor-pointer font-medium text-gray-900 hover:bg-gray-50 list-none flex items-center justify-between">
                    {faq.question}
                    <svg
                      className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <div className="px-6 pb-4 text-gray-600">{faq.answer}</div>
                </details>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Still need help?</h2>
            <p className="text-gray-600 mb-4">
              Can&apos;t find what you&apos;re looking for? Our support team is here to help.
            </p>
            <a
              href="mailto:support@gather.app"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Contact Support
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
