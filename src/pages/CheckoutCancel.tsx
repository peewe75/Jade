import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function CheckoutCancel() {
  const { t } = useTranslation();
  return (
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-serif">{t('checkout.cancel.title')}</h1>
        <p className="text-sm text-gray-600 max-w-sm leading-relaxed">
          {t('checkout.cancel.message')}
        </p>
        <Link
          to="/cart"
          className="inline-block px-10 py-4 bg-brand-black text-white text-xs uppercase tracking-widest font-medium hover:opacity-80 transition-opacity"
        >
          {t('checkout.cancel.backToCart')}
        </Link>
      </div>
    </main>
  );
}
