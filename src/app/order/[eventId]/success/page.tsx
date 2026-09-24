'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ConfirmedOrder {
  id: string;
  eventName: string;
  productName: string;
  name: string;
  email: string;
  fit: string | null;
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-paper">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 mb-4" />
        <p className="text-gray-600">Confirming your order...</p>
      </div>
    );
  }

  if (state === 'error' || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-paper px-4">
        <AlertCircle className="w-10 h-10 text-amber-500 mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">We couldn&apos;t confirm your order</h1>
        <p className="text-gray-600 mb-6 text-center max-w-md">
          If you completed payment, your order was still received &mdash; check your bank or
          card statement for the charge as proof of purchase. Otherwise, you can try ordering again.
        </p>
        <Link href={`/order/${eventId}`} className="btn btn-primary">Back to order form</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-paper">
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card p-8 bg-white text-center">
          <CheckCircle2 className="w-12 h-12 text-accent-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order confirmed!</h1>
          <p className="text-gray-600 mb-4">
            Thanks, {order.name.split(' ')[0]}! Your order has been received.
          </p>
          <p className="text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-8">
            Please take a screenshot of this page for your records &mdash; it&apos;s your order confirmation.
          </p>

          <div className="text-left border border-gray-200 rounded-lg divide-y divide-gray-200 text-sm">
            <div className="flex justify-between px-4 py-3">
              <span className="text-gray-500">Event</span>
              <span className="font-medium text-gray-900">{order.eventName}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-gray-500">Item</span>
              <span className="font-medium text-gray-900">{order.productName}</span>
            </div>
            {order.fit && (
              <div className="flex justify-between px-4 py-3">
                <span className="text-gray-500">Fit</span>
                <span className="font-medium text-gray-900">{order.fit}</span>
              </div>
            )}
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
              Order more merch
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
