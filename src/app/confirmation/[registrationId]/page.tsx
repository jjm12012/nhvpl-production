import Link from 'next/link';
import { CheckCircle2, Calendar, Mail, Phone, Trophy } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatDate, divisionLabel, formatCurrency } from '@/lib/utils';
import { notFound } from 'next/navigation';

async function getRegistrationDetails(registrationId: string) {
  try {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { event: true },
    });

    return registration;
  } catch (error) {
    console.error('Failed to fetch registration:', error);
    return null;
  }
}

export default async function ConfirmationPage({
  params,
}: {
  params: { registrationId: string };
}) {
  const registration = await getRegistrationDetails(params.registrationId);

  if (!registration) {
    notFound();
  }

  const addToCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=NHVPL+Pickleball+-+${registration.event.name}&dates=${registration.event.startDate.toISOString().split('T')[0]}/${registration.event.endDate.toISOString().split('T')[0]}&location=${encodeURIComponent(registration.event.location || 'Wilbur Cross High School')}&details=New+Haven+Pickleball+League`;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-accent-50 via-white to-primary-50">
      {/* Header */}
      <header className="bg-paper/90 backdrop-blur border-b border-primary-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium">
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Card */}
        <div className="card p-8 sm:p-12 mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-100 rounded-full mb-4">
              <CheckCircle2 className="w-8 h-8 text-accent-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Registration Confirmed!
            </h1>
            <p className="text-lg text-gray-600">
              Welcome to the New Haven Pickleball League
            </p>
          </div>

          {/* Player Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary-600" />
              Your Registration Details
            </h2>

            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">Name</p>
                <p className="text-lg text-gray-900 font-semibold">
                  {registration.firstName} {registration.lastName}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Event</p>
                  <p className="text-gray-900 font-medium">{registration.event.name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Skill Division</p>
                  <p className="text-gray-900 font-medium">
                    {divisionLabel(registration.division)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Status</p>
                  <div className="inline-flex items-center gap-2 bg-accent-100 text-accent-700 px-3 py-1 rounded-full text-sm font-medium">
                    <span className="w-2 h-2 bg-accent-600 rounded-full" />
                    Payment Confirmed
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <p className="text-sm text-gray-600 font-medium mb-1">Amount Paid</p>
                <p className="text-2xl font-bold text-primary-600">
                  {registration.amountPaid ? formatCurrency(Number(registration.amountPaid), registration.event.currency) : '$30.00'}
                </p>
              </div>
            </div>
          </div>

          {/* Event Information */}
          <div className="bg-primary-50 rounded-lg p-6 mb-8">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              Event Information
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 font-medium">Dates</p>
                <p className="text-gray-900">
                  {formatDate(registration.event.startDate)} —{' '}
                  {formatDate(registration.event.endDate)}
                </p>
              </div>

              {registration.event.dayOfWeek && (
                <div>
                  <p className="text-sm text-gray-600 font-medium">Time</p>
                  <p className="text-gray-900">{registration.event.dayOfWeek}</p>
                </div>
              )}

              {registration.event.location && (
                <div>
                  <p className="text-sm text-gray-600 font-medium">Location</p>
                  <p className="text-gray-900">{registration.event.location}</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 mb-8">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </p>
              <p className="text-gray-900">{registration.email}</p>
            </div>

            {registration.phone && (
              <div>
                <p className="text-sm text-gray-600 font-medium mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone
                </p>
                <p className="text-gray-900">{registration.phone}</p>
              </div>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={addToCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
            >
              <Calendar className="w-4 h-4" />
              Add to Calendar
            </a>

            <Link href="/" className="btn btn-primary">
              Return Home
            </Link>
          </div>
        </div>

        {/* League Info Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="font-bold text-gray-900 mb-4">Next Steps</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-3">
                <span className="text-primary-600 font-bold">1.</span>
                <span>Watch for updates via email</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary-600 font-bold">2.</span>
                <span>Check in 30 minutes before your first match</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary-600 font-bold">3.</span>
                <span>Bring your own paddle</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary-600 font-bold">4.</span>
                <span>Have fun and make friends!</span>
              </li>
            </ul>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-gray-900 mb-4">League Coordinator</h3>
            <p className="text-sm text-gray-600 mb-4">
              <strong>Chloe Shevlin</strong>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Questions about your registration or the league?
            </p>
            <a
              href="mailto:nhvpickleball@gmail.com"
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              nhvpickleball@gmail.com
            </a>
          </div>
        </div>

        {/* Social Links */}
        <div className="mt-8 p-6 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600 text-sm mb-4">
            Connect with the league on social media
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://instagram.com/nhvpbleague"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              Instagram: @nhvpbleague
            </a>
            <span className="text-gray-300">•</span>
            <a
              href="https://facebook.com/groups/EastRockPickleball"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              Facebook: East Rock Pickleball
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-bark text-white py-8 border-t border-white/10 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} New Haven Pickleball League. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
