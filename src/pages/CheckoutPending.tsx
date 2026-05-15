import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { db } from '../firebase';
import { useCart } from '../contexts/CartContext';

interface BankDetails {
  iban: string;
  bic?: string;
  beneficiary: string;
  bank?: string;
}

interface PendingOrder {
  orderNumber: string;
  paymentStatus: string;
  paymentMethod: string;
  totals: { total: number };
  bankDetails?: BankDetails;
  cryptoPaymentUrl?: string;
  cryptoStatus?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="ml-2 text-gray-400 hover:text-brand-black transition-colors"
      title="Copia"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function CheckoutPending() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { clearCart } = useCart();
  const { t } = useTranslation();
  const [order, setOrder] = useState<PendingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const clearedRef = useRef(false);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }

    if (!clearedRef.current) {
      clearedRef.current = true;
      void clearCart();
    }

    const orderRef = doc(db, 'orders', orderId);
    const unsub = onSnapshot(orderRef, snap => {
      if (snap.exists()) {
        setOrder(snap.data() as PendingOrder);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [orderId, clearCart]);

  if (loading) {
    return (
      <main className="flex-grow pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!order || !orderId) {
    return (
      <main className="flex-grow pt-24 pb-16 px-4 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-sm text-gray-500 mb-6">Ordine non trovato.</p>
        <Link to="/cart" className="text-xs uppercase tracking-widest underline underline-offset-4">
          {t('checkout.cancel.backToCart')}
        </Link>
      </main>
    );
  }

  const isPaid = order.paymentStatus === 'paid';

  if (isPaid) {
    return (
      <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-serif mb-2">{t('checkout.success.title')}</h1>
            <p className="text-sm text-gray-500">
              {t('checkout.success.orderNumber')}: <strong>{order.orderNumber}</strong>
            </p>
          </div>
          <p className="text-sm text-gray-600 max-w-sm leading-relaxed">{t('checkout.success.message')}</p>
          <Link
            to="/shop"
            className="inline-block px-10 py-4 bg-brand-black text-white text-xs uppercase tracking-widest font-medium hover:opacity-80 transition-opacity"
          >
            {t('checkout.pending.continueShopping')}
          </Link>
        </div>
      </main>
    );
  }

  const bank = order.bankDetails;
  const isCrypto = order.paymentMethod === 'crypto';
  const amountFormatted = `€${(order.totals.total / 100).toFixed(2)}`;

  const awaitingLabel = isCrypto
    ? t('checkout.pending.awaitingCrypto')
    : t('checkout.pending.awaiting');

  return (
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
      <div className="mb-3">
        <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          {awaitingLabel}
        </span>
      </div>

      <h1 className="text-4xl font-serif mb-2">{t('checkout.pending.title')}</h1>
      <div className="w-12 h-[1px] bg-brand-black mb-10" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: payment instructions */}
        <div className="lg:col-span-3">
          {isCrypto ? (
            /* ── Crypto section ── */
            <>
              <h2 className="text-lg font-serif mb-6">{t('checkout.pending.cryptoTitle')}</h2>

              <div className="border border-gray-100 divide-y divide-gray-100 mb-6">
                <div className="px-5 py-4">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">
                    {t('checkout.pending.amount')}
                  </p>
                  <p className="text-lg font-semibold">{amountFormatted}</p>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">
                    {t('checkout.pending.orderNumber')}
                  </p>
                  <p className="text-sm font-mono font-medium">{order.orderNumber}</p>
                </div>
                {order.cryptoStatus && (
                  <div className="px-5 py-4">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">
                      {t('checkout.pending.cryptoStatus')}
                    </p>
                    <p className="text-sm font-medium capitalize">{order.cryptoStatus}</p>
                  </div>
                )}
              </div>

              {order.cryptoPaymentUrl && (
                <a
                  href={order.cryptoPaymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-10 py-4 bg-brand-black text-white text-xs uppercase tracking-widest font-medium hover:opacity-80 transition-opacity mb-6"
                >
                  {t('checkout.pending.cryptoPayButton')}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <p className="text-sm text-gray-500 leading-relaxed">
                {t('checkout.pending.cryptoInstructions')}
              </p>
            </>
          ) : (
            /* ── Bank transfer section ── */
            <>
              <h2 className="text-lg font-serif mb-6">{t('checkout.pending.bankTitle')}</h2>

              <div className="border border-gray-100 divide-y divide-gray-100 mb-6">
                {/* Order number / causale */}
                <div className="px-5 py-4 bg-red-50 border-l-4 border-red-400">
                  <p className="text-[10px] uppercase tracking-widest text-red-600 mb-1">
                    {t('checkout.pending.causale')}
                  </p>
                  <div className="flex items-center">
                    <p className="text-lg font-bold text-red-700 tracking-widest">{order.orderNumber}</p>
                    <CopyButton text={order.orderNumber} />
                  </div>
                </div>

                {/* Amount */}
                <div className="px-5 py-4">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">
                    {t('checkout.pending.amount')}
                  </p>
                  <div className="flex items-center">
                    <p className="text-lg font-semibold">{amountFormatted}</p>
                    <CopyButton text={(order.totals.total / 100).toFixed(2)} />
                  </div>
                </div>

                {bank && (
                  <>
                    <div className="px-5 py-4">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">
                        {t('checkout.pending.beneficiary')}
                      </p>
                      <p className="text-sm font-medium">{bank.beneficiary}</p>
                    </div>

                    <div className="px-5 py-4">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">
                        {t('checkout.pending.iban')}
                      </p>
                      <div className="flex items-center">
                        <p className="text-sm font-mono font-medium tracking-wider">{bank.iban}</p>
                        <CopyButton text={bank.iban} />
                      </div>
                    </div>

                    {bank.bic && (
                      <div className="px-5 py-4">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">
                          {t('checkout.pending.bic')}
                        </p>
                        <div className="flex items-center">
                          <p className="text-sm font-mono font-medium">{bank.bic}</p>
                          <CopyButton text={bank.bic} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="border border-amber-200 bg-amber-50 px-5 py-4 mb-6">
                <p className="text-xs text-amber-800 leading-relaxed">
                  ⚠️ {t('checkout.pending.importantNote')}
                </p>
              </div>

              <p className="text-sm text-gray-500 leading-relaxed">
                {t('checkout.pending.instructions')}
              </p>
            </>
          )}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-2">
          <div className="border border-gray-100 p-5 lg:sticky lg:top-28">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-4">
              {t('checkout.pending.orderNumber')}: <strong className="text-brand-black">{order.orderNumber}</strong>
            </p>
            <div className="border-t border-gray-100 pt-4 flex justify-between text-sm">
              <span className="text-gray-500">{t('cart.subtotal')}</span>
              <span className="font-medium">{amountFormatted}</span>
            </div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-3">
              {t('checkout.shippingQuoted')}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
