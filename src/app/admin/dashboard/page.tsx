import { TrendingUp, Users, DollarSign, Calendar, Award } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/utils';
import DivisionChart from '@/components/DivisionChart';
import ClearTestDataButton from '@/components/ClearTestDataButton';

async function getDashboardStats() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalPaid, totalRevenue, activeEvent, todayCount, divisionBreakdown, recentRegistrations] = await Promise.all([
      // Total paid registrations
      prisma.registration.count({
        where: { paymentStatus: 'PAID' },
      }),

      // Total revenue
      prisma.registration.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { amountPaid: true },
      }),

      // Get active event
      prisma.event.findFirst({
        where: {
          isActive: true,
          registrationOpen: { lte: now },
          registrationClose: { gte: now },
        },
        orderBy: { startDate: 'asc' },
      }),

      // Registrations today
      prisma.registration.count({
        where: {
          paymentStatus: 'PAID',
          createdAt: { gte: today },
        },
      }),

      // Division breakdown
      prisma.registration.groupBy({
        by: ['division'],
        where: { paymentStatus: 'PAID' },
        _count: true,
      }),

      // Recent registrations
      prisma.registration.findMany({
        where: { paymentStatus: 'PAID' },
        include: { event: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const spotsRemaining = activeEvent
      ? Math.max(0, (activeEvent.maxCapacity || 0) - totalPaid)
      : null;

    const divisionData = [
      { name: 'Beginner', count: divisionBreakdown.find((d) => d.division === 'BEGINNER')?._count || 0 },
      { name: 'Intermediate', count: divisionBreakdown.find((d) => d.division === 'INTERMEDIATE')?._count || 0 },
      { name: 'Advanced', count: divisionBreakdown.find((d) => d.division === 'ADVANCED')?._count || 0 },
    ];

    return {
      totalPaid,
      totalRevenue: Number(totalRevenue._sum.amountPaid || 0),
      spotsRemaining,
      todayCount,
      divisionData,
      recentRegistrations,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return null;
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  if (!stats) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-600">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Overview of league registration and statistics</p>
        </div>
        <ClearTestDataButton />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Registrations */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Registrations</h3>
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalPaid}</p>
          <p className="text-xs text-gray-500 mt-1">Paid registrations</p>
        </div>

        {/* Total Revenue */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
            <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-1">All payments</p>
        </div>

        {/* Spots Remaining */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Spots Remaining</h3>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.spotsRemaining ?? '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Active event</p>
        </div>

        {/* Registrations Today */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Registrations Today</h3>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.todayCount}</p>
          <p className="text-xs text-gray-500 mt-1">Past 24 hours</p>
        </div>
      </div>

      {/* Division Breakdown & Recent Registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Division Breakdown Chart */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-600" />
            Division Breakdown
          </h3>

          <DivisionChart data={stats.divisionData} />
        </div>

        {/* Summary Stats */}
        <div className="space-y-4">
          {stats.divisionData.map((division) => (
            <div key={division.name} className="card p-4">
              <p className="text-sm text-gray-600 font-medium mb-1">{division.name}</p>
              <p className="text-2xl font-bold text-gray-900">{division.count}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalPaid > 0 ? ((division.count / stats.totalPaid) * 100).toFixed(1) : '0.0'}% of total
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Registrations Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Recent Registrations</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Name</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Event</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Division</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Amount</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.recentRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No registrations yet
                  </td>
                </tr>
              ) : (
                stats.recentRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {reg.firstName} {reg.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{reg.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{reg.event.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                        {reg.division}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatCurrency(Number(reg.amountPaid))}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(reg.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
