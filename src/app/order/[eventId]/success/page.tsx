'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ConfirmedOrder {
  id: string;
  eventName: string;
  name: string;
  email: string;
  size: string;
  color: string;
  quantity: number;
  totalAmount: number;
  createdAt: string;
}

export default function OrderSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;
  const sessionId = searchParams.get('session_id');

  const [order, setOrder] = useState<ConfirmedOrder | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!sessionId) {
      setState('error');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/order/confirm?session_id=${encodeURIComponent(sessionId)}`);
        if (cancelled) return;
        if (!res.ok) {
          setState('error');
          return;
        }
        setOrder(await res.json());
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 mb-4" />
        <p className="text-gray-600">Confirming your order...</p>
      </div>
    );
  }

  if (state === 'error' || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <AlertCircle className="w-10 h-10 text-amber-500 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">We couldn&apos;t confirm your order</h1>
        <p className="text-gray-600 mb-6 text-center max-w-md">
          If you completed payment, your order was still received and you&apos;ll get a
          confirmation email shortly. Otherwise, you can try ordering again.
        </p>
        <Link href={`/order/${eventId}`} className="btn btn-primary">Back to order form</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card p-8 bg-white text-center">
          <CheckCircle2 className="w-12 h-12 text-accent-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order confirmed!</h1>
          <p className="text-gray-600 mb-8">
            Thanks, {order.name.split(' ')[0]}! A confirmation email is on its way to {order.email}.
          </p>

          <div className="text-left border border-gray-200 rounded-lg divide-y divide-gray-200 text-sm">
            <div className="flex justify-between px-4 py-3">
              <span className="text-gray-500">Event</span>
              <span className="font-medium text-gray-900">{order.eventName}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-gray-500">Size</span>
              <span className="font-medium text-gray-900">{order.size}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-gray-500">Color</span>
              <span className="font-medium text-gray-900">{order.color}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-gray-500">Quantity</span>
              <span className="font-medium text-gray-900">{order.quantity}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-gray-500">Total paid</span>
              <span className="font-bold text-gray-900">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>

          <div className="mt-8">
            <Link href={`/order/${eventId}`} className="btn btn-secondary">
              Order more shirts
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
