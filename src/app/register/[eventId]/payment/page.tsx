'use client';

import { useState, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useContent } from '@/lib/useContent';
import Content from '@/components/Content';

function PaymentPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;
  const registrationId = searchParams.get('registrationId') as string;
  const cancelled = searchParams.get('cancelled');
  const errorParam = searchParams.get('error');
  const c = useContent('register_payment');

  const [isLoading, setIsLoading] = useState(false);

  const handleStripePayment = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();

      if (!url) throw new Error('No checkout URL returned');

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Stripe error:', error);
      toast.error('Payment setup failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSimulatedPayment = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/register/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId,
          paymentMethod: 'STRIPE_CARD',
          amount: 30,
        }),
      });

      if (!response.ok) throw new Error('Failed to process payment');

      toast.success('Payment successful!');
      router.push(`/confirmation/${registrationId}`);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment processing failed. Please try again.');
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
            Back
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-600 text-white font-bold text-sm">
              ✓
            </div>
            <div className="flex-1 h-1 bg-primary-600" />
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-bold text-sm">
              2
            </div>
          </div>
          <p className="text-sm text-gray-600">Step 2 of 2: Payment</p>
        </div>

        {/* Cancelled notice */}
        {cancelled && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">Payment was cancelled. You can try again whenever you're ready.</p>
          </div>
        )}

        {/* Division filled while checkout was open — payment was refunded */}
        {errorParam === 'division_full' && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              Unfortunately, your division filled up while you were completing payment. Your card
              has been refunded in full — refunds typically appear within 5–10 business days.
              Please email{' '}
              <a href="mailto:nhvpickleball@gmail.com" className="underline font-medium">
                nhvpickleball@gmail.com
              </a>{' '}
              to be added to the waitlist.
            </p>
          </div>
        )}

        {/* Payment did not complete */}
        {errorParam === 'payment_incomplete' && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Your payment didn&apos;t go through. Please try again.
            </p>
          </div>
        )}

        {/* Payment Card */}
        <div className="card p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Complete Your Payment</h1>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Spring 2026 League Registration</span>
                <span className="font-medium text-gray-900">{formatCurrency(30)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-primary-600">{formatCurrency(30)}</span>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <div className="space-y-4 mb-8">
            <button
              onClick={handleStripePayment}
              disabled={isLoading}
              className="w-full p-4 border-2 border-primary-600 rounded-lg font-medium transition flex items-center justify-between text-primary-600 hover:bg-primary-50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                <span>Pay with Card</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>Visa · Mastercard · Apple Pay</span>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
            </button>

            {/* Dev Simulated Payment */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={handleSimulatedPayment}
                disabled={isLoading}
                className="w-full btn btn-secondary flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Simulate Payment (Dev)'
                )}
              </button>
            )}
          </div>

          {/* Security Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-900">
              <Content content={c.register_payment_notice} inline />
            </div>
          </div>

          {/* Refund Policy (hidden when blank) */}
          {c.register_refund_policy.value.trim() && (
            <div className="mt-4 text-sm text-gray-600">
              <Content content={c.register_refund_policy} />
            </div>
          )}
        </div>

        {/* Support */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            Having trouble? Email us at{' '}
            <a href="mailto:nhvpickleball@gmail.com" className="text-primary-600 hover:text-primary-700 font-medium">
              nhvpickleball@gmail.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}
