import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About - Gather',
  description: 'Learn more about Gather, the event platform that brings people together.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mt-6 mb-8">About Gather</h1>

        <div className="prose prose-lg max-w-none text-gray-600 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
            <p>
              Gather is a modern event platform designed to make creating, discovering, and managing
              events seamless and enjoyable. We believe in the power of bringing people together,
              whether for small intimate gatherings or large community events.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What We Offer</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Easy Event Creation</strong> – Create beautiful event pages in minutes with
                our intuitive interface.
              </li>
              <li>
                <strong>RSVP Management</strong> – Track who&apos;s coming, manage capacity, and send
                updates to attendees.
              </li>
              <li>
                <strong>Privacy Controls</strong> – Host private events, public gatherings, or
                anything in between.
              </li>
              <li>
                <strong>Calendar Integration</strong> – Sync your events with Google Calendar,
                Apple Calendar, and more.
              </li>
              <li>
                <strong>Community Features</strong> – Build and engage with your community through
                recurring events.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Story</h2>
            <p>
              Founded with the vision of making event organization accessible to everyone, Gather
              started as a simple tool for friends to coordinate meetups. Today, it has grown into a
              full-featured platform used by communities, organizations, and individuals around the
              world.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <p>
              Have questions or feedback? We&apos;d love to hear from you. Reach out to us at{' '}
              <a href="mailto:hello@gather.app" className="text-indigo-600 hover:text-indigo-700">
                hello@gather.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
