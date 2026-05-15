import { Link } from 'react-router-dom';
import { Minus, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../contexts/CartContext';

export default function Cart() {
  const { items, subtotal, removeItem, updateQty } = useCart();
  const { t } = useTranslation();

  if (items.length === 0) {
    return (
      <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-serif">{t('cart.title')}</h1>
          <p className="text-sm text-gray-500">{t('cart.empty')}</p>
          <Link
            to="/shop"
            className="inline-block mt-4 px-8 py-3 bg-brand-black text-white text-xs uppercase tracking-widest font-medium hover:opacity-80 transition-opacity"
          >
            {t('cart.exploreCta')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
      <h1 className="text-4xl font-serif mb-2">{t('cart.title')}</h1>
      <div className="w-12 h-[1px] bg-brand-black mb-10"></div>

      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-4 py-3 mb-8 uppercase tracking-widest">
        {t('cart.holdNotice')}
      </p>

      <div className="space-y-8">
        <AnimatePresence initial={false}>
          {items.map(item => (
            <motion.div
              key={`${item.productId}:${item.variantId}`}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex gap-6 pb-8 border-b border-gray-100"
            >
              <Link
                to={`/product/${item.productId}`}
                className="shrink-0 w-24 h-32 bg-gray-100 overflow-hidden"
              >
                <img
                  src={item.imageSnapshot}
                  alt={item.nameSnapshot}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </Link>

              <div className="flex-grow flex flex-col justify-between">
                <div className="flex justify-between">
                  <div>
                    <Link
                      to={`/product/${item.productId}`}
                      className="text-sm font-medium hover:text-gray-600 transition-colors"
                    >
                      {item.nameSnapshot}
                    </Link>
                    {(item.sizeLabel || item.colorLabel) && (
                      <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">
                        {[item.sizeLabel, item.colorLabel].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="text-sm mt-2">€{(item.priceSnapshot / 100).toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => void removeItem(item.productId, item.variantId)}
                    className="text-gray-300 hover:text-brand-black transition-colors p-1 -mt-1 shrink-0"
                    aria-label={t('cart.remove')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => void updateQty(item.productId, item.variantId, item.qty - 1)}
                    className="w-8 h-8 border border-gray-200 flex items-center justify-center hover:border-brand-black transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm w-6 text-center tabular-nums">{item.qty}</span>
                  <button
                    onClick={() => void updateQty(item.productId, item.variantId, item.qty + 1)}
                    className="w-8 h-8 border border-gray-200 flex items-center justify-center hover:border-brand-black transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col items-end gap-3">
        <div className="flex justify-between w-full max-w-xs">
          <span className="text-sm uppercase tracking-widest text-gray-500">{t('cart.subtotal')}</span>
          <span className="text-sm font-medium tabular-nums">€{(subtotal / 100).toFixed(2)}</span>
        </div>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest">{t('cart.shippingNote')}</p>
        <Link
          to="/checkout"
          className="mt-2 w-full max-w-xs text-center bg-brand-black text-white py-4 text-xs uppercase tracking-widest font-medium hover:opacity-90 transition-opacity"
        >
          {t('cart.checkout')}
        </Link>
        <Link
          to="/shop"
          className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-brand-black transition-colors"
        >
          {t('cart.continueShopping')}
        </Link>
      </div>
    </main>
  );
}
