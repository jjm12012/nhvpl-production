'use client';

import { useState, useEffect, useMemo } from 'react';
import { Download, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatCurrency, divisionLabel, paymentMethodLabel } from '@/lib/utils';

interface Registration {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  division: string;
  amountPaid: string | null;
  paymentStatus: string;
  paymentMethod?: string;
  interestedInCaptain: string;
  teamPreference?: string;
  createdAt: Date;
  event: {
    name: string;
    currency: string;
  };
}

export default function RegistrantsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 20;

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/registrants');

      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }

      const data = await response.json();
      setRegistrations(data);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('Failed to load registrations');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter data
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      const matchesSearch =
        reg.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesEvent = !filterEvent || reg.event.name === filterEvent;
      const matchesDivision = !filterDivision || reg.division === filterDivision;
      const matchesStatus = !filterStatus || reg.paymentStatus === filterStatus;

      return matchesSearch && matchesEvent && matchesDivision && matchesStatus;
    });
  }, [registrations, searchTerm, filterEvent, filterDivision, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedRegistrations = filteredRegistrations.slice(
    startIdx,
    startIdx + itemsPerPage
  );

  // Unique values for filters
  const uniqueEvents = [...new Set(registrations.map((r) => r.event.name))];
  const uniqueDivisions = [...new Set(registrations.map((r) => r.division))];

  const handleExportCSV = () => {
    try {
      const headers = [
        'First Name',
        'Last Name',
        'Email',
        'Phone',
        'Event',
        'Division',
        'Captain?',
        'Team Preference',
        'Payment Status',
        'Payment Method',
        'Amount',
        'Date',
      ];

      const rows = filteredRegistrations.map((reg) => [
        reg.firstName,
        reg.lastName,
        reg.email,
        reg.phone,
        reg.event.name,
        divisionLabel(reg.division as any),
        reg.interestedInCaptain === 'yes' ? 'Yes' : 'No',
        reg.teamPreference || '',
        reg.paymentStatus,
        reg.paymentMethod ? paymentMethodLabel(reg.paymentMethod as any) : '—',
        formatCurrency(reg.amountPaid, reg.event.currency),
        formatDate(reg.createdAt),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${cell}"`).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registrations-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Registrants</h1>
          <p className="text-gray-600">
            Total: {filteredRegistrations.length} registration
            {filteredRegistrations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="btn btn-secondary gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-6 space-y-4">
        {/* Search */}
        <div>
          <label className="label">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Event</label>
            <select
              value={filterEvent}
              onChange={(e) => {
                setFilterEvent(e.target.value);
                setCurrentPage(1);
              }}
              className="input"
            >
              <option value="">All Events</option>
              {uniqueEvents.map((event) => (
                <option key={event} value={event}>
                  {event}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Division</label>
            <select
              value={filterDivision}
              onChange={(e) => {
                setFilterDivision(e.target.value);
                setCurrentPage(1);
              }}
              className="input"
            >
              <option value="">All Divisions</option>
              {uniqueDivisions.map((division) => (
                <option key={division} value={division}>
                  {divisionLabel(division as any)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Payment Status</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="input"
            >
              <option value="">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Name</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Email</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Phone</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Event</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Division</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Captain?</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Payment</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Amount</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No registrations found
                  </td>
                </tr>
              ) : (
                paginatedRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {reg.firstName} {reg.lastName}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{reg.email}</td>
                    <td className="px-6 py-4 text-gray-600">{reg.phone}</td>
                    <td className="px-6 py-4 text-gray-600">{reg.event.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                        {divisionLabel(reg.division as any)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {reg.interestedInCaptain === 'yes' ? '✓' : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        reg.paymentStatus === 'COMPLETED'
                          ? 'bg-accent-100 text-accent-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {reg.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatCurrency(reg.amountPaid, reg.event.currency)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
