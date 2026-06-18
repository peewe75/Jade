import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { CreditCard, Building2, Bitcoin, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { functions } from '../firebase';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

type Step = 1 | 2 | 3;
type PaymentMethod = 'stripe' | 'bank' | 'crypto';

interface ShippingForm {
  firstName: string;
  lastName: string;
  email: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
}

const inputClass =
  'w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors';
const labelClass = 'block text-[10px] uppercase tracking-widest text-gray-500 mb-1';

export default function Checkout() {
  const { items, subtotal } = useCart();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<ShippingForm>({
    firstName: '',
    lastName: '',
    email: user?.email ?? '',
    line1: '',
    city: '',
    postalCode: '',
    country: 'IT',
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const field =
    (key: keyof ShippingForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  const step1Valid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.line1.trim() &&
    form.city.trim() &&
    form.postalCode.trim() &&
    form.country;

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const locale = i18n.language.startsWith('it') ? 'it' : ('en' as const);
      const cartItems = items.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        qty: i.qty,
      }));

      if (paymentMethod === 'stripe') {
        const callFn = httpsCallable<
          { items: typeof cartItems; shippingAddress: ShippingForm; locale: 'it' | 'en' },
          { checkoutUrl: string; orderId: string }
        >(functions, 'createCheckoutSession');
        const result = await callFn({ items: cartItems, shippingAddress: form, locale });
        window.location.href = result.data.checkoutUrl;
      } else if (paymentMethod === 'bank') {
        const callFn = httpsCallable<
          { items: typeof cartItems; shippingAddress: ShippingForm; locale: 'it' | 'en' },
          { orderId: string; orderNumber: string; totalCents: number; bankDetails: object }
        >(functions, 'createBankTransferOrder');
        const result = await callFn({ items: cartItems, shippingAddress: form, locale });
        navigate(`/checkout/pending?orderId=${result.data.orderId}`);
      } else {
        const callFn = httpsCallable<
          { items: typeof cartItems; shippingAddress: ShippingForm; locale: 'it' | 'en' },
          { orderId: string; paymentUrl: string }
        >(functions, 'createCryptoPayment');
        const result = await callFn({ items: cartItems, shippingAddress: form, locale });
        navigate(`/checkout/pending?orderId=${result.data.orderId}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('checkout.error');
      setError(msg);
      setLoading(false);
    }
  };

  const steps: Step[] = [1, 2, 3];
  const stepLabels = [t('checkout.step1'), t('checkout.step2'), t('checkout.step3')];

  return (
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
      <h1 className="text-4xl font-serif mb-2">{t('checkout.title')}</h1>
      <div className="w-12 h-[1px] bg-brand-black mb-10"></div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-12">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                step >= s ? 'bg-brand-black text-white' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s}
            </div>
            <span
              className={`text-[10px] uppercase tracking-widest hidden sm:block ${
                step === s ? 'text-brand-black font-semibold' : 'text-gray-400'
              }`}
            >
              {stepLabels[i]}
            </span>
            {s < 3 && <ChevronRight className="w-3 h-3 text-gray-300 mx-1" />}
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
        {/* Left: Steps */}
        <div className="flex-grow">
          {/* Step 1: Shipping */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-serif mb-8">{t('checkout.shippingInfo')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelClass}>{t('checkout.firstName')}</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={field('firstName')}
                    className={inputClass}
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('checkout.lastName')}</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={field('lastName')}
                    className={inputClass}
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className={labelClass}>{t('checkout.email')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={field('email')}
                  className={inputClass}
                  autoComplete="email"
                />
              </div>
              <div className="mb-4">
                <label className={labelClass}>{t('checkout.address')}</label>
                <input
                  type="text"
                  value={form.line1}
                  onChange={field('line1')}
                  className={inputClass}
                  autoComplete="address-line1"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelClass}>{t('checkout.city')}</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={field('city')}
                    className={inputClass}
                    autoComplete="address-level2"
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('checkout.postalCode')}</label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={field('postalCode')}
                    className={inputClass}
                    autoComplete="postal-code"
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('checkout.country')}</label>
                  <select value={form.country} onChange={field('country')} className={inputClass}>
                    <option value="IT">Italia</option>
                    <option value="DE">Deutschland</option>
                    <option value="FR">France</option>
                    <option value="ES">España</option>
                    <option value="GB">United Kingdom</option>
                    <option value="US">United States</option>
                    <option value="CH">Switzerland</option>
                    <option value="AT">Austria</option>
                    <option value="BE">Belgium</option>
                    <option value="NL">Netherlands</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="w-full sm:w-auto px-12 py-4 bg-brand-black text-white text-xs uppercase tracking-widest font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('checkout.next')}
              </button>
            </div>
          )}

          {/* Step 2: Payment method */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-serif mb-8">{t('checkout.paymentMethod')}</h2>
              <div className="space-y-3 mb-10">
                {/* Stripe */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('stripe')}
                  className={`w-full border-2 p-5 flex items-center gap-4 text-left transition-colors ${
                    paymentMethod === 'stripe'
                      ? 'border-brand-black'
                      : 'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className="w-5 h-5 shrink-0" />
                  <div className="flex-grow">
                    <p className="text-sm font-medium">{t('checkout.stripe')}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                      Visa · Mastercard · Amex
                    </p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-colors ${
                      paymentMethod === 'stripe'
                        ? 'border-brand-black bg-brand-black'
                        : 'border-gray-300'
                    }`}
                  />
                </button>

                {/* Bank transfer */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank')}
                  className={`w-full border-2 p-5 flex items-center gap-4 text-left transition-colors ${
                    paymentMethod === 'bank'
                      ? 'border-brand-black'
                      : 'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <Building2 className="w-5 h-5 shrink-0" />
                  <div className="flex-grow">
                    <p className="text-sm font-medium">{t('checkout.bankTransfer')}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                      IBAN · Conferma entro 1–3 gg
                    </p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-colors ${
                      paymentMethod === 'bank'
                        ? 'border-brand-black bg-brand-black'
                        : 'border-gray-300'
                    }`}
                  />
                </button>

                {/* Crypto — temporarily disabled */}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="px-8 py-4 border border-gray-200 text-xs uppercase tracking-widest font-medium hover:border-brand-black transition-colors"
                >
                  {t('checkout.back')}
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 sm:flex-none px-12 py-4 bg-brand-black text-white text-xs uppercase tracking-widest font-medium hover:opacity-90 transition-opacity"
                >
                  {t('checkout.next')}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-serif mb-8">{t('checkout.review')}</h2>

              {/* Shipping address recap */}
              <div className="mb-6 p-5 border border-gray-100">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-3">
                  {t('checkout.shippingInfo')}
                </p>
                <p className="text-sm">
                  {form.firstName} {form.lastName}
                </p>
                <p className="text-sm text-gray-500">{form.line1}</p>
                <p className="text-sm text-gray-500">
                  {form.postalCode} {form.city} · {form.country}
                </p>
                <p className="text-sm text-gray-500">{form.email}</p>
              </div>

              {/* Payment method recap */}
              <div className="mb-8 p-5 border border-gray-100 flex items-center gap-3">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 shrink-0">
                  {t('checkout.paymentMethod')}:
                </p>
                <p className="text-sm font-medium">
                  {paymentMethod === 'stripe'
                    ? t('checkout.stripe')
                    : paymentMethod === 'bank'
                    ? t('checkout.bankTransfer')
                    : t('checkout.crypto')}
                </p>
              </div>

              {error && (
                <p className="text-red-500 text-sm mb-4 border border-red-100 bg-red-50 px-4 py-3">
                  {error}
                </p>
              )}

              {/* Avviso diritto di recesso — art. 49 D.Lgs. 206/2005 */}
              <div className="mb-6 border border-gray-100 bg-gray-50 px-5 py-4 text-[11px] leading-6 text-gray-500">
                Procedendo con l'acquisto accetti i nostri{' '}
                <Link to="/terms" className="underline underline-offset-2 hover:text-brand-black">
                  Termini e Condizioni
                </Link>
                {' '}e la{' '}
                <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-brand-black">
                  Privacy Policy
                </Link>
                . Ai sensi del D.Lgs. 206/2005 hai il{' '}
                <Link to="/recesso" className="font-medium underline underline-offset-2 hover:text-brand-black">
                  diritto di recesso
                </Link>
                {' '}entro <strong>14 giorni</strong> dalla ricezione dei beni, senza fornire alcuna motivazione.
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="px-8 py-4 border border-gray-200 text-xs uppercase tracking-widest font-medium hover:border-brand-black transition-colors disabled:opacity-40"
                >
                  {t('checkout.back')}
                </button>
                <button
                  onClick={() => void handleConfirm()}
                  disabled={loading}
                  className="flex-1 sm:flex-none px-12 py-4 bg-brand-black text-white text-xs uppercase tracking-widest font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? t('checkout.processing') : t('checkout.confirm')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Order summary (sticky) */}
        <div className="lg:w-80 shrink-0">
          <div className="lg:sticky lg:top-28 border border-gray-100 p-6">
            <h3 className="text-[10px] uppercase tracking-widest text-gray-500 mb-6">
              {t('checkout.orderSummary')}
            </h3>
            <div className="space-y-4 mb-6">
              {items.map(item => (
                <div
                  key={`${item.productId}:${item.variantId}`}
                  className="flex gap-3"
                >
                  <div className="w-14 h-18 shrink-0 bg-gray-100 overflow-hidden">
                    <img
                      src={item.imageSnapshot}
                      alt={item.nameSnapshot}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-grow">
                    <p className="text-xs font-medium leading-tight">{item.nameSnapshot}</p>
                    {(item.sizeLabel || item.colorLabel) && (
                      <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest">
                        {[item.sizeLabel, item.colorLabel].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="text-xs mt-1 tabular-nums">
                      €{(item.priceSnapshot / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('cart.subtotal')}</span>
                <span className="tabular-nums">€{(subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('checkout.total')}</span>
                <span className="font-medium tabular-nums">€{(subtotal / 100).toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest pt-2">
                {t('checkout.shippingQuoted')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
