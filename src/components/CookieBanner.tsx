import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

export const CONSENT_KEY = 'jade_cookie_consent';
export type ConsentValue = 'all' | 'essential' | null;

export function getCookieConsent(): ConsentValue {
  try {
    return (localStorage.getItem(CONSENT_KEY) as ConsentValue) ?? null;
  } catch {
    return null;
  }
}

export function useCookieConsent(): ConsentValue {
  const [consent, setConsent] = useState<ConsentValue>(getCookieConsent);

  useEffect(() => {
    const handler = () => setConsent(getCookieConsent());
    window.addEventListener('jade:consent', handler);
    return () => window.removeEventListener('jade:consent', handler);
  }, []);

  return consent;
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Delay check so SSR / hydration edge-cases don't flash the banner
    if (!getCookieConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = (value: ConsentValue) => {
    try {
      localStorage.setItem(CONSENT_KEY, value!);
    } catch {}
    window.dispatchEvent(new Event('jade:consent'));
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Preferenze cookie"
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Text */}
        <p className="text-xs text-gray-500 leading-relaxed flex-grow">
          Utilizziamo cookie tecnici essenziali per il funzionamento del sito e cookie analitici
          (opzionali) per migliorare l'esperienza.{' '}
          <Link
            to="/cookies"
            className="underline underline-offset-2 hover:text-brand-black transition-colors"
          >
            Cookie policy
          </Link>
          {' · '}
          <Link
            to="/privacy-policy"
            className="underline underline-offset-2 hover:text-brand-black transition-colors"
          >
            Privacy policy
          </Link>
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => accept('essential')}
            className="text-[10px] uppercase tracking-widest border border-gray-200 px-4 py-2 hover:border-brand-black transition-colors whitespace-nowrap"
          >
            Solo essenziali
          </button>
          <button
            onClick={() => accept('all')}
            className="text-[10px] uppercase tracking-widest bg-brand-black text-white px-4 py-2 hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            Accetta tutti
          </button>
          <button
            onClick={() => accept('essential')}
            aria-label="Chiudi"
            className="text-gray-300 hover:text-brand-black transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
