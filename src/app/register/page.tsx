import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import {
  formatDate,
  formatCurrency,
  spotsRemaining,
} from '@/lib/utils';

// FIX: force dynamic so registration page always shows live event data
export const dynamic = 'force-dynamic';

async function getActiveEvents() {
  try {
    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        registrationOpen: {
          lte: new Date(),
        },
        registrationClose: {
          gte: new Date(),
        },
      },
      include: {
        registrations: {
          // Only count completed (PAID) registrations toward the division cap.
          // PENDING signups (step 1 completed, payment not yet made) do not hold a spot.
          where: {
            paymentStatus: 'PAID',
          },
          select: {
            id: true,
            division: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
    return events;
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
}

export default async function EventSelectionPage() {
  const events = await getActiveEvents();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium">
            &larr; Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Select an Event</h1>
          <p className="text-lg text-gray-600">
            Choose which event you&apos;d like to register for.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-600 mb-4">
              No events are currently open for registration.
            </p>
            <p className="text-sm text-gray-500">
              Please check back soon or contact us for more information.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const paidCount = event.registrations.length;
              const remaining = spotsRemaining(event, paidCount);
              const isFull = remaining !== null && remaining === 0;

              return (
                <div
                  key={event.id}
                  className="card overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white">
                    <h3 className="text-xl font-bold mb-2">{event.name}</h3>
                    <p className="text-sm text-primary-100">
                      {event.season} {event.year}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="space-y-4 flex-1">
                      <div>
                        <p className="text-sm text-gray-600 font-medium">Dates</p>
                        <p className="text-gray-900">
                          {formatDate(event.startDate)} — {formatDate(event.endDate)}
                        </p>
                      </div>
                      {event.location && (
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Location</p>
                          <p className="text-gray-900">{event.location}</p>
                        </div>
                      )}
                      {event.dayOfWeek && (
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Day & Time</p>
                          <p className="text-gray-900">{event.dayOfWeek}</p>
                        </div>
                      )}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-gray-600 font-medium">Price</span>
                          <span className="text-2xl font-bold text-primary-600">
                            {formatCurrency(event.price, event.currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CTA */}
                    {isFull ? (
                      <span className="mt-6 btn bg-gray-100 text-gray-400 cursor-not-allowed flex items-center justify-center">
                        Event Full
                      </span>
                    ) : (
                      <Link
                        href={`/register/${event.id}`}
                        className="mt-6 btn btn-primary gap-2 flex items-center justify-center"
                      >
                        Register
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white border-t border-gray-800 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-gray-400 text-sm text-center">
            Need help? Email us at{' '}
            <a
              href="mailto:nhvpickleball@gmail.com"
              className="text-primary-400 hover:text-primary-300"
            >
              nhvpickleball@gmail.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
