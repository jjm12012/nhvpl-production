import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { SkillLevel } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  formatDate,
  formatCurrency,
  spotsRemaining,
  spotsRemainingForDivision,
  divisionLabel,
} from '@/lib/utils';

// FIX: force dynamic so registration page always shows live event data
export const dynamic = 'force-dynamic';

const DIVISIONS: SkillLevel[] = [
  'BEGINNER',
  'INTERMEDIATE_A',
  'INTERMEDIATE_B',
  'ADVANCED',
];

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
          // Count anything that's not explicitly failed/cancelled/refunded so pending
          // registrations still hold a spot toward the division cap.
          where: {
            paymentStatus: { in: ['PAID', 'PENDING'] },
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
              const paidCountsByDivision: Record<SkillLevel, number> = {
                BEGINNER: 0,
                INTERMEDIATE_A: 0,
                INTERMEDIATE_B: 0,
                ADVANCED: 0,
              };
              for (const r of event.registrations) {
                paidCountsByDivision[r.division] =
                  (paidCountsByDivision[r.division] || 0) + 1;
              }
              const paidCount = event.registrations.length;
              const remaining = spotsRemaining(event, paidCount);
              const isFull = remaining !== null && remaining === 0;

              // Build per-division remaining list (only divisions with a cap configured)
              const divisionBreakdown = DIVISIONS.map((level) => ({
                level,
                remaining: spotsRemainingForDivision(
                  event,
                  level,
                  paidCountsByDivision[level] || 0
                ),
              })).filter((d) => d.remaining !== null) as {
                level: SkillLevel;
                remaining: number;
              }[];

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
                      {remaining !== null && (
                        <div
                          className={`p-3 rounded-lg ${
                            isFull
                              ? 'bg-red-50 text-red-700'
                              : 'bg-primary-50 text-primary-700'
                          }`}
                        >
                          <p className="text-sm font-medium">
                            {isFull
                              ? 'Event Full'
                              : `${remaining} spot${remaining !== 1 ? 's' : ''} remaining`}
                          </p>
                          {divisionBreakdown.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {divisionBreakdown.map(({ level, remaining: divRemaining }) => {
                                const divFull = divRemaining === 0;
                                return (
                                  <li
                                    key={level}
                                    className={`flex items-center justify-between text-xs ${
                                      divFull
                                        ? 'text-red-700'
                                        : isFull
                                          ? 'text-red-700/80'
                                          : 'text-primary-700/80'
                                    }`}
                                  >
                                    <span>{divisionLabel(level)}</span>
                                    <span className="font-medium">
                                      {divFull
                                        ? 'Full'
                                        : `${divRemaining} spot${divRemaining !== 1 ? 's' : ''} left`}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      )}
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
