'use client';

import { useState, useEffect } from 'react';
import { Edit2, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/lib/utils';
import EventModal from '@/components/EventModal';

interface Event {
  id: string;
  name: string;
  season: string;
  year: number;
  startDate: Date;
  endDate: Date;
  price: number;
  currency: string;
  location?: string;
  maxBeginner?: number | null;
  maxIntermediateA?: number | null;
  maxIntermediateB?: number | null;
  maxAdvanced?: number | null;
  isActive: boolean;
  _count?: {
    registrations: number;
  };
}

function totalCapacity(e: Event): number | null {
  const caps = [e.maxBeginner, e.maxIntermediateA, e.maxIntermediateB, e.maxAdvanced]
    .filter((c): c is number => typeof c === 'number');
  if (caps.length === 0) return null;
  return caps.reduce((sum, c) => sum + c, 0);
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/events');

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (event?: Event) => {
    setSelectedEvent(event || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleSaveEvent = async (formData: any) => {
    try {
      const url = selectedEvent
        ? `/api/admin/events/${selectedEvent.id}`
        : '/api/admin/events';

      const method = selectedEvent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save event');
      }

      toast.success(selectedEvent ? 'Event updated' : 'Event created');
      handleCloseModal();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    }
  };

  const handleToggleActive = async (event: Event) => {
    try {
      const response = await fetch(`/api/admin/events/${event.id}/toggle`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }

      toast.success('Event updated');
      fetchEvents();
    } catch (error) {
      console.error('Error toggling event:', error);
      toast.error('Failed to update event');
    }
  };

  const handleDeleteEvent = async (event: Event) => {
    if (!confirm(`Delete "${event.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/events/${event.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      toast.success('Event deleted');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Events</h1>
          <p className="text-gray-600">Manage league events and registration periods</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn btn-primary gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {/* Events Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Event</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Dates</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Location</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Price</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Registrations</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No events yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{event.name}</p>
                        <p className="text-xs text-gray-500">
                          {event.season} {event.year}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(event.startDate)} —{' '}
                      {formatDate(event.endDate)}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {event.location || '—'}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatCurrency(event.price, event.currency)}
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {event._count?.registrations || 0}
                      {totalCapacity(event) !== null && (
                        <span className="text-gray-500"> / {totalCapacity(event)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(event)}
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                          event.isActive
                            ? 'bg-accent-100 text-accent-700 hover:bg-accent-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {event.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(event)}
                          className="p-2 text-gray-600 hover:text-primary-600 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event)}
                          className="p-2 text-gray-600 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Modal */}
      {isModalOpen && (
        <EventModal
          event={selectedEvent}
          onClose={handleCloseModal}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  );
}
