'use client';
import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  description?: string;
  season: string;
  year: number;
  startDate: Date;
  endDate: Date;
  registrationOpen: Date;
  registrationClose: Date;
  price: number;
  currency: string;
  location?: string;
  dayOfWeek?: string;
  maxBeginner?: number | null;
  maxIntermediateA?: number | null;
  maxIntermediateB?: number | null;
  maxAdvancedA?: number | null;
  maxAdvancedB?: number | null;
  isActive: boolean;
  formType?: 'LEAGUE' | 'MERCHANDISE';
  unitPrice?: number | null;
  availableColors?: string[];
  orderOpenDate?: Date | string | null;
  orderCloseDate?: Date | string | null;
}

// Format a date value for a datetime-local input (YYYY-MM-DDTHH:mm).
function toDateTimeLocal(value: Date | string | null | undefined): string {
  if (!value) return '';
  const iso = value instanceof Date ? value.toISOString() : value;
  return iso.slice(0, 16);
}

interface EventModalProps {
  event: Event | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function EventModal({ event, onClose, onSave }: EventModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formType, setFormType] = useState<'LEAGUE' | 'MERCHANDISE'>(
    event?.formType || 'LEAGUE'
  );
  const [merchData, setMerchData] = useState({
    unitPrice: '',
    availableColors: '',
    orderOpenDate: '',
    orderCloseDate: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    season: '',
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    registrationOpen: '',
    registrationClose: '',
    price: 30,
    currency: 'USD',
    location: '',
    dayOfWeek: '',
    maxBeginner: '',
    maxIntermediateA: '',
    maxIntermediateB: '',
    maxAdvancedA: '',
    maxAdvancedB: '',
    isActive: true,
  });

  useEffect(() => {
    if (event) {
      setFormData({
        name: event.name,
        description: event.description || '',
        season: event.season,
        year: event.year,
        startDate: event.startDate instanceof Date
          ? event.startDate.toISOString().split('T')[0]
          : event.startDate.split('T')[0],
        endDate: event.endDate instanceof Date
          ? event.endDate.toISOString().split('T')[0]
          : event.endDate.split('T')[0],
        registrationOpen: event.registrationOpen instanceof Date
          ? event.registrationOpen.toISOString().split('T')[0]
          : event.registrationOpen.split('T')[0],
        registrationClose: event.registrationClose instanceof Date
          ? event.registrationClose.toISOString().split('T')[0]
          : event.registrationClose.split('T')[0],
        price: event.price,
        currency: event.currency,
        location: event.location || '',
        dayOfWeek: event.dayOfWeek || '',
        maxBeginner: event.maxBeginner != null ? event.maxBeginner.toString() : '',
        maxIntermediateA: event.maxIntermediateA != null ? event.maxIntermediateA.toString() : '',
        maxIntermediateB: event.maxIntermediateB != null ? event.maxIntermediateB.toString() : '',
        maxAdvancedA: event.maxAdvancedA != null ? event.maxAdvancedA.toString() : '',
        maxAdvancedB: event.maxAdvancedB != null ? event.maxAdvancedB.toString() : '',
        isActive: event.isActive,
      });
      setFormType(event.formType || 'LEAGUE');
      setMerchData({
        unitPrice: event.unitPrice != null ? event.unitPrice.toString() : '',
        availableColors: (event.availableColors || []).join(', '),
        orderOpenDate: toDateTimeLocal(event.orderOpenDate),
        orderCloseDate: toDateTimeLocal(event.orderCloseDate),
      });
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (formType === 'MERCHANDISE') {
        await onSave({
          formType: 'MERCHANDISE',
          name: formData.name,
          description: formData.description || undefined,
          unitPrice: parseFloat(merchData.unitPrice),
          availableColors: merchData.availableColors,
          orderOpenDate: merchData.orderOpenDate,
          orderCloseDate: merchData.orderCloseDate,
          isActive: formData.isActive,
        });
        return;
      }

      const submitData = {
        ...formData,
        year: parseInt(formData.year.toString()),
        price: parseFloat(formData.price.toString()),
        // Send undefined (not null) so Zod .optional() accepts it
        maxBeginner: formData.maxBeginner ? parseInt(formData.maxBeginner) : undefined,
        maxIntermediateA: formData.maxIntermediateA ? parseInt(formData.maxIntermediateA) : undefined,
        maxIntermediateB: formData.maxIntermediateB ? parseInt(formData.maxIntermediateB) : undefined,
        maxAdvancedA: formData.maxAdvancedA ? parseInt(formData.maxAdvancedA) : undefined,
        maxAdvancedB: formData.maxAdvancedB ? parseInt(formData.maxAdvancedB) : undefined,
      };
      await onSave(submitData);
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleMerchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMerchData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">
            {event ? 'Edit Event' : 'Create Event'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Form Type */}
          <div>
            <label className="label">Form Type *</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
              {([
                { value: 'LEAGUE', label: 'League Registration' },
                { value: 'MERCHANDISE', label: 'Merchandise Order' },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormType(option.value)}
                  className={`py-2 px-3 rounded-md text-sm font-medium transition ${
                    formType === option.value
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="label">Event Name *</label>
            <input
              id="name" name="name" type="text"
              value={formData.name} onChange={handleChange}
              placeholder="Spring 2026 League" className="input" required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="label">Description</label>
            <textarea
              id="description" name="description"
              value={formData.description} onChange={handleChange}
              placeholder="Event details..." rows={3} className="input"
            />
          </div>

          {/* Merchandise-only fields */}
          {formType === 'MERCHANDISE' && (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="unitPrice" className="label">Unit Price (USD) *</label>
                  <input
                    id="unitPrice" name="unitPrice" type="number" step="0.01" min="0.01"
                    value={merchData.unitPrice} onChange={handleMerchChange}
                    placeholder="25.00" className="input" required
                  />
                  <p className="text-xs text-gray-500 mt-1">Price per shirt</p>
                </div>
                <div>
                  <label htmlFor="availableColors" className="label">Available Colors *</label>
                  <input
                    id="availableColors" name="availableColors" type="text"
                    value={merchData.availableColors} onChange={handleMerchChange}
                    placeholder="Navy, White, Grey" className="input" required
                  />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated list</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label htmlFor="orderOpenDate" className="label">Order Open Date *</label>
                  <input
                    id="orderOpenDate" name="orderOpenDate" type="datetime-local"
                    value={merchData.orderOpenDate} onChange={handleMerchChange}
                    className="input" required
                  />
                </div>
                <div>
                  <label htmlFor="orderCloseDate" className="label">Order Close Date *</label>
                  <input
                    id="orderCloseDate" name="orderCloseDate" type="datetime-local"
                    value={merchData.orderCloseDate} onChange={handleMerchChange}
                    className="input" required
                  />
                </div>
              </div>
            </>
          )}

          {/* League-only fields */}
          {formType === 'LEAGUE' && (
          <>
          {/* Season & Year */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="season" className="label">Season *</label>
              <input
                id="season" name="season" type="text"
                value={formData.season} onChange={handleChange}
                placeholder="Spring" className="input" required
              />
            </div>
            <div>
              <label htmlFor="year" className="label">Year *</label>
              <input
                id="year" name="year" type="number"
                value={formData.year} onChange={handleChange}
                className="input" required
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="startDate" className="label">Start Date *</label>
              <input
                id="startDate" name="startDate" type="date"
                value={formData.startDate} onChange={handleChange}
                className="input" required
              />
            </div>
            <div>
              <label htmlFor="endDate" className="label">End Date *</label>
              <input
                id="endDate" name="endDate" type="date"
                value={formData.endDate} onChange={handleChange}
                className="input" required
              />
            </div>
          </div>

          {/* Registration Dates */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="registrationOpen" className="label">Registration Opens *</label>
              <input
                id="registrationOpen" name="registrationOpen" type="date"
                value={formData.registrationOpen} onChange={handleChange}
                className="input" required
              />
            </div>
            <div>
              <label htmlFor="registrationClose" className="label">Registration Closes *</label>
              <input
                id="registrationClose" name="registrationClose" type="date"
                value={formData.registrationClose} onChange={handleChange}
                className="input" required
              />
            </div>
          </div>

          {/* Price & Location */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="price" className="label">Price *</label>
              <input
                id="price" name="price" type="number" step="0.01"
                value={formData.price} onChange={handleChange}
                className="input" required
              />
            </div>
            <div>
              <label htmlFor="location" className="label">Location</label>
              <input
                id="location" name="location" type="text"
                value={formData.location} onChange={handleChange}
                placeholder="Wilbur Cross High School" className="input"
              />
            </div>
          </div>

          {/* Day of Week */}
          <div>
            <label htmlFor="dayOfWeek" className="label">Day &amp; Time</label>
            <input
              id="dayOfWeek" name="dayOfWeek" type="text"
              value={formData.dayOfWeek} onChange={handleChange}
              placeholder="Wednesday Evenings" className="input"
            />
          </div>

          {/* Max Capacity per Skill Level */}
          <div>
            <label className="label">Max Capacity by Skill Level</label>
            <p className="text-xs text-gray-500 mb-3">
              Leave blank for unlimited in that division. Players will not be able to register for a division once it fills up.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="maxBeginner" className="text-xs font-medium text-gray-700 mb-1 block">Beginner</label>
                <input
                  id="maxBeginner" name="maxBeginner" type="number" min="0"
                  value={formData.maxBeginner} onChange={handleChange}
                  placeholder="Unlimited" className="input"
                />
              </div>
              <div>
                <label htmlFor="maxIntermediateB" className="text-xs font-medium text-gray-700 mb-1 block">Intermediate B</label>
                <input
                  id="maxIntermediateB" name="maxIntermediateB" type="number" min="0"
                  value={formData.maxIntermediateB} onChange={handleChange}
                  placeholder="Unlimited" className="input"
                />
              </div>
              <div>
                <label htmlFor="maxIntermediateA" className="text-xs font-medium text-gray-700 mb-1 block">Intermediate A</label>
                <input
                  id="maxIntermediateA" name="maxIntermediateA" type="number" min="0"
                  value={formData.maxIntermediateA} onChange={handleChange}
                  placeholder="Unlimited" className="input"
                />
              </div>
              <div>
                <label htmlFor="maxAdvancedB" className="text-xs font-medium text-gray-700 mb-1 block">Advanced B</label>
                <input
                  id="maxAdvancedB" name="maxAdvancedB" type="number" min="0"
                  value={formData.maxAdvancedB} onChange={handleChange}
                  placeholder="Unlimited" className="input"
                />
              </div>
              <div>
                <label htmlFor="maxAdvancedA" className="text-xs font-medium text-gray-700 mb-1 block">Advanced A</label>
                <input
                  id="maxAdvancedA" name="maxAdvancedA" type="number" min="0"
                  value={formData.maxAdvancedA} onChange={handleChange}
                  placeholder="Unlimited" className="input"
                />
              </div>
            </div>
          </div>
          </>
          )}

          {/* Active */}
          <div className="flex items-center gap-3">
            <input
              id="isActive" name="isActive" type="checkbox"
              checked={formData.isActive} onChange={handleChange}
              className="w-4 h-4 text-primary-600"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-900">Active</label>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary gap-2" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Event'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
