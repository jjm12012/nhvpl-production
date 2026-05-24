'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { registrationSchema, type RegistrationInput } from '@/lib/validations';
import { formatPhone, divisionDescription } from '@/lib/utils';
import { useContent } from '@/lib/useContent';
import Content from '@/components/Content';

const DIVISIONS = [
  { id: 'BEGINNER', label: 'Beginner', capKey: 'maxBeginner', descKey: 'register_form_division_desc_beginner' },
  { id: 'INTERMEDIATE_A', label: 'Intermediate A', capKey: 'maxIntermediateA', descKey: 'register_form_division_desc_intermediate_a' },
  { id: 'INTERMEDIATE_B', label: 'Intermediate B', capKey: 'maxIntermediateB', descKey: 'register_form_division_desc_intermediate_b' },
  { id: 'ADVANCED', label: 'Advanced', capKey: 'maxAdvanced', descKey: 'register_form_division_desc_advanced' },
] as const;

interface ActiveEvent {
  id: string;
  maxBeginner: number | null;
  maxIntermediateA: number | null;
  maxIntermediateB: number | null;
  maxAdvanced: number | null;
  paidCountsByDivision?: Record<string, number>;
}

export default function RegistrationFormPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  const [isLoading, setIsLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const c = useContent('register_form');

  useEffect(() => {
    // Fetch capacity/paid counts so we can show "Full" and disable full divisions.
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/events/active');
        if (!res.ok) return;
        const events = (await res.json()) as ActiveEvent[];
        if (cancelled) return;
        const match = events.find((e) => e.id === eventId);
        if (match) setActiveEvent(match);
      } catch {
        // Non-fatal: form will still submit and be validated server-side.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const isDivisionFull = (capKey: string): boolean => {
    if (!activeEvent) return false;
    const cap = (activeEvent as any)[capKey] as number | null | undefined;
    if (cap === null || cap === undefined) return false;
    const taken = activeEvent.paidCountsByDivision?.[
      DIVISIONS.find((d) => d.capKey === capKey)?.id as string
    ] ?? 0;
    return taken >= cap;
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      eventId,
      division: 'BEGINNER',
      interestedInCaptain: 'no',
      willingToMonitor: 'no',
    },
  });

  const selectedDivision = watch('division');
  const phoneValue = watch('phone');

  const onSubmit = async (data: RegistrationInput) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || 'Registration failed. Please try again.');
        return;
      }

      const result = await response.json();
      router.push(`/register/${eventId}/payment?registrationId=${result.registrationId}`);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-bold text-sm">
              1
            </div>
            <div className="flex-1 h-1 bg-gray-300" />
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 text-gray-600 font-bold text-sm">
              2
            </div>
          </div>
          <p className="text-sm text-gray-600">Step 1 of 2: Your Information</p>
        </div>

        <div className="card p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">{c.register_form_title.value}</h1>

          <form onSubmit={handleSubmit(onSubmit, (formErrors) => {
            console.log('Validation errors:', formErrors);
            toast.error('Please fix the errors below before continuing.');
          })} className="space-y-8">
            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">Please fix the following errors:</p>
                  <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                    {Object.entries(errors).map(([key, error]) => (
                      <li key={key}>{(error as any)?.message || `${key} is invalid`}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Personal Information */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-6">{c.register_form_section_personal.value}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="firstName" className="label">
                    First Name *
                  </label>
                  <input
                    {...register('firstName')}
                    placeholder="John"
                    className="input"
                  />
                  {errors.firstName && (
                    <p className="text-red-600 text-sm mt-1">{errors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="lastName" className="label">
                    Last Name *
                  </label>
                  <input
                    {...register('lastName')}
                    placeholder="Smith"
                    className="input"
                  />
                  {errors.lastName && (
                    <p className="text-red-600 text-sm mt-1">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label htmlFor="email" className="label">
                    Email Address *
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="john@example.com"
                    className="input"
                  />
                  {errors.email && (
                    <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmEmail" className="label">
                    Confirm Email Address *
                  </label>
                  <input
                    {...register('confirmEmail')}
                    type="email"
                    placeholder="john@example.com"
                    className="input"
                  />
                  {errors.confirmEmail && (
                    <p className="text-red-600 text-sm mt-1">{errors.confirmEmail.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="label">
                    Phone Number *
                  </label>
                  <input
                    {...register('phone')}
                    placeholder="(203) 555-1234"
                    className="input"
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setValue('phone', formatted);
                    }}
                  />
                  {errors.phone && (
                    <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Format: (XXX) XXX-XXXX</p>
                </div>
              </div>
            </section>

            {/* Skill Division */}
            <section className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{c.register_form_section_division.value} *</h2>

              <div className="space-y-4">
                {DIVISIONS.map((division) => {
                  const full = isDivisionFull(division.capKey);
                  return (
                    <label
                      key={division.id}
                      className={`flex items-start p-4 border rounded-lg transition ${
                        full
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                          : 'border-gray-300 cursor-pointer hover:bg-gray-50'
                      }`}
                    >
                      <input
                        {...register('division')}
                        type="radio"
                        value={division.id}
                        disabled={full}
                        className="mt-1 w-4 h-4 text-primary-600"
                      />
                      <div className="ml-4 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">{division.label}</p>
                          {full && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Full
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {(c[division.descKey]?.value) ?? divisionDescription(division.id as any)}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {errors.division && (
                <p className="text-red-600 text-sm mt-2">{errors.division.message}</p>
              )}
            </section>

            {/* Leadership Interest */}
            <section className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{c.register_form_section_leadership.value}</h2>

              <div className="space-y-6">
                <div>
                  <label className="label">{c.register_form_captain_question.value} *</label>
                  <div className="flex gap-6">
                    {[
                      { value: 'yes', label: 'Yes' },
                      { value: 'no', label: 'No' },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          {...register('interestedInCaptain')}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-primary-600"
                        />
                        <span className="text-gray-900">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.interestedInCaptain && (
                    <p className="text-red-600 text-sm mt-1">{errors.interestedInCaptain.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">{c.register_form_monitor_question.value} *</label>
                  <div className="flex gap-6">
                    {[
                      { value: 'yes', label: 'Yes' },
                      { value: 'no', label: 'No' },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          {...register('willingToMonitor')}
                          type="radio"
                          value={option.value}
                          className="w-4 h-4 text-primary-600"
                        />
                        <span className="text-gray-900">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.willingToMonitor && (
                    <p className="text-red-600 text-sm mt-1">{errors.willingToMonitor.message}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Team & Preferences */}
            <section className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{c.register_form_section_team.value}</h2>

              <div>
                <label htmlFor="teamPreference" className="label">
                  Team Preference (Optional)
                </label>
                <input
                  {...register('teamPreference')}
                  placeholder="e.g., Jane Doe"
                  className="input"
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {c.register_form_team_pref_help.value}
                </p>
              </div>
            </section>

            {/* Waivers & Acknowledgments */}
            <section className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{c.register_form_section_acknowledgments.value} *</h2>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  <input
                    {...register('canCommit')}
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm text-gray-900">
                    {c.register_form_ack_commit.value}
                  </span>
                </label>
                {errors.canCommit && (
                  <p className="text-red-600 text-sm">{errors.canCommit.message}</p>
                )}

                <label className="flex items-start gap-3 cursor-pointer p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  <input
                    {...register('liabilityAck')}
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm text-gray-900">
                    {c.register_form_ack_liability.value}
                  </span>
                </label>
                {errors.liabilityAck && (
                  <p className="text-red-600 text-sm">{errors.liabilityAck.message}</p>
                )}

                <label className="flex items-start gap-3 cursor-pointer p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  <input
                    {...register('funAck')}
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm text-gray-900">
                    {c.register_form_ack_fun.value}
                  </span>
                </label>
                {errors.funAck && (
                  <p className="text-red-600 text-sm">{errors.funAck.message}</p>
                )}

                <label className="flex items-start gap-3 cursor-pointer p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                  <input
                    {...register('conductAck')}
                    type="checkbox"
                    className="mt-1 w-4 h-4 text-primary-600"
                  />
                  <span
                    className="text-sm text-gray-900"
                    onClick={(e) => {
                      // Let link clicks open the document without toggling the checkbox,
                      // while clicks on the surrounding text still toggle it.
                      if ((e.target as HTMLElement).closest('a')) e.stopPropagation();
                    }}
                  >
                    <Content content={c.register_form_ack_conduct} inline />
                  </span>
                </label>
                {errors.conductAck && (
                  <p className="text-red-600 text-sm">{errors.conductAck.message}</p>
                )}
              </div>
            </section>

            {/* Submit */}
            <div className="border-t border-gray-200 pt-8 flex items-center justify-between">
              <Link href="/register" className="btn-secondary gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>

              <button type="submit" disabled={isLoading} className="btn-primary gap-2">
                {isLoading ? 'Processing...' : 'Continue to Payment'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
