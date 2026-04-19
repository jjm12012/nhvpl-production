// ============================================================
// FIX B of 2
// DESTINATION: src/app/page.tsx
// ACTION: REPLACE the existing file at this path
// CHANGE: Added `export const dynamic = 'force-dynamic'` at the top
//         so Next.js never statically caches this page — it fetches
//         live data from Prisma on every visit, so toggling a event
//         active/inactive shows immediately on the homepage.
// ============================================================

import Link from 'next/link';
import { ArrowRight, Trophy, Clock, Users } from 'lucide-react';
import { prisma } from '@/lib/prisma';

// FIX: force server-side render on every request so isActive changes
// are reflected immediately without a redeploy
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
      select: {
        id: true,
        name: true,
        season: true,
        year: true,
      },
      take: 1,
    });
    return events;
  } catch (error) {
    console.error('Failed to fetch active events:', error);
    return [];
  }
}

export default async function HomePage() {
  const activeEvents = await getActiveEvents();
  const hasActiveEvent = activeEvents.length > 0;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">NHVPL</h1>
                <p className="text-xs text-gray-500">New Haven Pickleball</p>
              </div>
            </div>
            <nav className="flex items-center gap-4">
              <a href="https://nhvpickleball.com" target="_blank" rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-primary-600 transition">
                Website
              </a>
              <Link href="/admin/login" className="text-sm text-gray-600 hover:text-primary-600 transition">
                Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-blue-400 py-20 sm:py-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {hasActiveEvent && (
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-white/30">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-medium text-white">Spring 2026 Registration Now Open</span>
              </div>
            )}
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
              New Haven Pickleball League
            </h1>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join us for an exciting 8-week competitive season. Build your skills, make new
              friends, and compete in a supportive community.
            </p>
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-8 mb-8 inline-block">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-left">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Location</p>
                  <p className="text-lg font-bold text-gray-900">Wilbur Cross HS</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Day & Time</p>
                  <p className="text-lg font-bold text-gray-900">Tue–Thu Evenings</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Dates</p>
                  <p className="text-lg font-bold text-gray-900">May 6 – Jun 24</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Cost</p>
                  <p className="text-lg font-bold text-primary-600">$30</p>
                </div>
              </div>
            </div>
            {hasActiveEvent ? (
              <Link href="/register" className="btn-primary gap-2 mb-6 inline-flex">
                Register Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-lg mb-6 border border-white/30">
                <span className="text-white font-medium">Registration is currently closed — check back soon!</span>
              </div>
            )}
            <p className="text-white/75 text-sm">
              Questions? Email us at{' '}
              <a href="mailto:nhvpickleball@gmail.com" className="underline hover:text-white">
                nhvpickleball@gmail.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Why Join NHVPL?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="card p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">4 Skill Divisions</h3>
              <p className="text-gray-600">
                Play at your level with Beginner, Intermediate A, Intermediate B, and Advanced
                divisions to ensure competitive balance.
              </p>
            </div>
            <div className="card p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">8-Week Season</h3>
              <p className="text-gray-600">
                Consistent Tuesday through Thursday evening matches throughout May and June.
                Perfect for building momentum and friendships.
              </p>
            </div>
            <div className="card p-6">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Teams & Captains</h3>
              <p className="text-gray-600">
                Form teams with fellow players. Interested captains get leadership opportunities
                and special recognition.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-primary-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Join the League?</h2>
          <p className="text-gray-600 text-lg mb-8">
            Registration is open now. Don&apos;t miss your chance to be part of New Haven&apos;s
            fastest-growing pickleball community.
          </p>
          {hasActiveEvent && (
            <Link href="/register" className="btn-primary gap-2 inline-flex">
              Register Today
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5" /> NHVPL
              </h3>
              <p className="text-gray-400 text-sm">
                New Haven Pickleball League - Building community through competitive play.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">League Coordinator</h4>
              <p className="text-gray-400 text-sm mb-2">
                <strong>Chloe Shevlin</strong>
              </p>
              <a href="mailto:nhvpickleball@gmail.com" className="text-primary-400 hover:text-primary-300 text-sm">
                nhvpickleball@gmail.com
              </a>
            </div>
            <div>
              <h4 className="font-bold mb-4">Connect With Us</h4>
              <div className="flex flex-col gap-2 text-sm">
                <a href="https://nhvpickleball.com" target="_blank" rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300">
                  Website: nhvpickleball.com
                </a>
                <a href="https://instagram.com/nhvpbleague" target="_blank" rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300">
                  Instagram: @nhvpbleague
                </a>
                <a href="https://facebook.com/groups/EastRockPickleball" target="_blank" rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300">
                  Facebook: East Rock Pickleball
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-gray-400 text-sm">
              © {new Date().getFullYear()} New Haven Pickleball League. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
