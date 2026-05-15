import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { useCart } from '../contexts/CartContext';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { clearCart } = useCart();
  const { t } = useTranslation();
  const [status, setStatus] = useState<'pending' | 'paid'>('pending');
  const [orderNumber, setOrderNumber] = useState('');
  const clearedRef = useRef(false);

  useEffect(() => {
    if (!orderId) {
      setStatus('paid');
      return;
    }

    // Clear cart once on arrival
    if (!clearedRef.current) {
      clearedRef.current = true;
      void clearCart();
    }

    // Listen for order payment confirmation
    const orderRef = doc(db, 'orders', orderId);
    const unsub = onSnapshot(orderRef, snap => {
      const data = snap.data();
      if (data?.orderNumber) setOrderNumber(data.orderNumber as string);
      if (data?.paymentStatus === 'paid') setStatus('paid');
    });

    // Fallback: assume paid after 30s if webhook is slow
    const timeout = setTimeout(() => setStatus('paid'), 30_000);

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, [orderId, clearCart]);

  return (
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
      {status === 'pending' ? (
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-brand-black border-t-transparent rounded-full animate-spin mx-auto mb-8" />
          <p className="text-xs uppercase tracking-widest text-gray-400">{t('common.loading')}</p>
        </div>
      ) : (
        <div className="text-center space-y-6">
          {/* Check icon */}
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div>
            <h1 className="text-3xl font-serif mb-3">{t('checkout.success.title')}</h1>
            {orderNumber && (
              <p className="text-sm text-gray-500">
                {t('checkout.success.orderNumber')}:{' '}
                <strong className="text-brand-black">{orderNumber}</strong>
              </p>
            )}
          </div>

          <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
            {t('checkout.success.message')}
          </p>

          <Link
            to="/shop"
            className="inline-block mt-4 px-10 py-4 bg-brand-black text-white text-xs uppercase tracking-widest font-medium hover:opacity-80 transition-opacity"
          >
            {t('checkout.success.continueShopping')}
          </Link>
        </div>
      )}
    </main>
  );
}
