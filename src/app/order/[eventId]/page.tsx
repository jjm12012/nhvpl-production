'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, ShoppingBag, AlertCircle } from 'lucide-react';
import { merchandiseOrderSchema, SHIRT_SIZES, SHIRT_FITS, type MerchandiseOrderInput } from '@/lib/validations';
import { formatCurrency } from '@/lib/utils';

interface MerchEvent {
  id: string;
  name: string;
  description: string | null;
  unitPrice: number | null;
  availableColors: string[];
  orderOpenDate: string | null;
  orderCloseDate: string | null;
  isOpen: boolean;
}

export default function OrderFormPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [isLoading, setIsLoading] = useState(false);
  const [event, setEvent] = useState<MerchEvent | null>(null);
  const [fetchState, setFetchState] = useState<'loading' | 'ready' | 'not_found'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/order/${eventId}`);
        if (cancelled) return;
        if (!res.ok) {
          setFetchState('not_found');
          return;
        }
        setEvent(await res.json());
        setFetchState('ready');
      } catch {
        if (!cancelled) setFetchState('not_found');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MerchandiseOrderInput>({
    resolver: zodResolver(merchandiseOrderSchema),
    defaultValues: { eventId, quantity: 1 },
  });

  const quantity = watch('quantity');
  const total =
    event?.unitPrice && quantity ? event.unitPrice * Number(quantity) : null;

  const onSubmit = async (data: MerchandiseOrderInput) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/order/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Could not start checkout. Please try again.');
        return;
      }

      const result = await response.json();
      // Redirect to Stripe Checkout
      window.location.href = result.url;
    } catch (error) {
      console.error('Order checkout error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (fetchState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (fetchState === 'not_found' || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <AlertCircle className="w-10 h-10 text-gray-400 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Order form not found</h1>
        <p className="text-gray-600 mb-6">This order link may be invalid or no longer available.</p>
        <Link href="/" className="btn btn-primary">Back to home</Link>
      </div>
    );
  }

  if (!event.isOpen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <ShoppingBag className="w-10 h-10 text-gray-400 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Orders are closed</h1>
        <p className="text-gray-600 mb-6 text-center max-w-md">
          Ordering for {event.name} is not open right now. Check back later or contact
          the league with any questions.
        </p>
        <Link href="/" className="btn btn-primary">Back to home</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h1>
          {event.description && <p className="text-gray-600">{event.description}</p>}
          {event.unitPrice != null && (
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {formatCurrency(event.unitPrice)} per shirt
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-6 bg-white">
          {/* Full Name */}
          <div>
            <label htmlFor="name" className="label">Full Name *</label>
            <input id="name" type="text" className="input" placeholder="Jane Doe" {...register('name')} />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="label">Email *</label>
            <input id="email" type="email" className="input" placeholder="jane@example.com" {...register('email')} />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
          </div>

          {/* Fit */}
          <div>
            <label htmlFor="fit" className="label">Fit *</label>
            <select id="fit" className="input" defaultValue="" {...register('fit')}>
              <option value="" disabled>Select a fit</option>
              {SHIRT_FITS.map((fit) => (
                <option key={fit} value={fit}>{fit}</option>
              ))}
            </select>
            {errors.fit && <p className="text-sm text-red-600 mt-1">{errors.fit.message}</p>}
          </div>

          {/* Size & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="size" className="label">Shirt Size *</label>
              <select id="size" className="input" defaultValue="" {...register('size')}>
                <option value="" disabled>Select a size</option>
                {SHIRT_SIZES.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              {errors.size && <p className="text-sm text-red-600 mt-1">{errors.size.message}</p>}
            </div>
            <div>
              <label htmlFor="color" className="label">Shirt Color *</label>
              <select id="color" className="input" defaultValue="" {...register('color')}>
                <option value="" disabled>Select a color</option>
                {event.availableColors.map((color) => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
              {errors.color && <p className="text-sm text-red-600 mt-1">{errors.color.message}</p>}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label htmlFor="quantity" className="label">Quantity *</label>
            <input
              id="quantity" type="number" min={1} className="input"
              {...register('quantity')}
            />
            {errors.quantity && <p className="text-sm text-red-600 mt-1">{errors.quantity.message}</p>}
          </div>

          {/* Total */}
          {total != null && !Number.isNaN(total) && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <span className="text-xl font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full gap-2" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to payment...
              </>
            ) : (
              'Submit Order'
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            You&apos;ll be redirected to Stripe to complete payment. Want more shirts in a
            different size or color? Just submit the form again after checkout.
          </p>
        </form>
      </main>
    </div>
  );
}
