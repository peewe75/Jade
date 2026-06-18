import { useState, type ChangeEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { CheckCircle2, ChevronLeft } from 'lucide-react';
import { functions } from '../firebase';

type Step = 'form' | 'confirm' | 'done';

interface WithdrawalForm {
  firstName: string;
  lastName: string;
  email: string;
  orderNumber: string;
  itemsDescription: string;
  orderDate: string;
  deliveryDate: string;
}

interface WithdrawalResult {
  withdrawalNumber: string;
  receivedAtIso: string;
  receivedAtLabel: string;
}

const inputClass =
  'w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors';
const labelClass = 'block text-[10px] uppercase tracking-widest text-gray-500 mb-1';

export default function RecessoForm() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');

  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<WithdrawalResult | null>(null);

  const [form, setForm] = useState<WithdrawalForm>({
    firstName: params.get('firstName') ?? '',
    lastName: params.get('lastName') ?? '',
    email: params.get('email') ?? '',
    orderNumber: params.get('orderNumber') ?? '',
    itemsDescription: params.get('items') ?? '',
    orderDate: '',
    deliveryDate: '',
  });

  const field =
    (key: keyof WithdrawalForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const formValid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
    form.orderNumber.trim() &&
    form.itemsDescription.trim();

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const callFn = httpsCallable<WithdrawalForm & { orderId: string | null }, WithdrawalResult>(
        functions,
        'submitWithdrawalRequest'
      );
      const res = await callFn({ ...form, orderId });
      setResult(res.data);
      setStep('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invio non riuscito. Riprova.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
      <Link
        to="/recesso"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-gray-400 hover:text-brand-black transition-colors mb-6"
      >
        <ChevronLeft className="w-3 h-3" />
        Diritto di recesso
      </Link>

      <h1 className="text-4xl font-serif mb-2">Recedere dal contratto</h1>
      <div className="w-12 h-[1px] bg-brand-black mb-4" />
      <p className="text-sm leading-7 text-gray-500 mb-10 max-w-2xl">
        Compila il modulo per esercitare il diritto di recesso entro 14 giorni dalla ricezione dei
        beni (art. 54-bis Codice del Consumo). Riceverai un avviso di ricevimento via email.
      </p>

      {/* Step: Form */}
      {step === 'form' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Nome *</label>
              <input type="text" value={form.firstName} onChange={field('firstName')} className={inputClass} autoComplete="given-name" />
            </div>
            <div>
              <label className={labelClass}>Cognome *</label>
              <input type="text" value={form.lastName} onChange={field('lastName')} className={inputClass} autoComplete="family-name" />
            </div>
          </div>

          <div className="mb-4">
            <label className={labelClass}>Email (per la ricevuta) *</label>
            <input type="email" value={form.email} onChange={field('email')} className={inputClass} autoComplete="email" />
          </div>

          <div className="mb-4">
            <label className={labelClass}>Numero d'ordine *</label>
            <input type="text" value={form.orderNumber} onChange={field('orderNumber')} className={inputClass} placeholder="JD-2026-0001" />
          </div>

          <div className="mb-4">
            <label className={labelClass}>Beni oggetto del recesso *</label>
            <textarea
              value={form.itemsDescription}
              onChange={field('itemsDescription')}
              className={`${inputClass} min-h-[90px] resize-y`}
              placeholder="Es. 1× Abito in seta, taglia M"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div>
              <label className={labelClass}>Data dell'ordine</label>
              <input type="date" value={form.orderDate} onChange={field('orderDate')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Data di ricezione</label>
              <input type="date" value={form.deliveryDate} onChange={field('deliveryDate')} className={inputClass} />
            </div>
          </div>

          <button
            onClick={() => setStep('confirm')}
            disabled={!formValid}
            className="w-full sm:w-auto px-12 py-4 bg-brand-black text-white text-xs uppercase tracking-widest font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continua
          </button>
        </div>
      )}

      {/* Step: Confirm (funzione di conferma richiesta dalla legge) */}
      {step === 'confirm' && (
        <div>
          <h2 className="text-xl font-serif mb-6">Conferma il recesso</h2>
          <div className="border border-gray-100 bg-gray-50 p-6 mb-6 text-sm leading-7 text-gray-700">
            <p className="mb-3">
              Con la presente comunico il recesso dal contratto di vendita relativo ai seguenti beni:
            </p>
            <p className="font-medium whitespace-pre-line mb-4">{form.itemsDescription}</p>
            <table className="w-full text-sm">
              <tbody>
                <tr><td className="py-1 text-gray-400 w-40">Ordine</td><td className="py-1 font-medium">{form.orderNumber}</td></tr>
                {form.orderDate && <tr><td className="py-1 text-gray-400">Ordinato il</td><td className="py-1">{form.orderDate}</td></tr>}
                {form.deliveryDate && <tr><td className="py-1 text-gray-400">Ricevuto il</td><td className="py-1">{form.deliveryDate}</td></tr>}
                <tr><td className="py-1 text-gray-400">Consumatore</td><td className="py-1">{form.firstName} {form.lastName}</td></tr>
                <tr><td className="py-1 text-gray-400">Ricevuta a</td><td className="py-1">{form.email}</td></tr>
              </tbody>
            </table>
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-4 border border-red-100 bg-red-50 px-4 py-3">{error}</p>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setStep('form')}
              disabled={loading}
              className="px-8 py-4 border border-gray-200 text-xs uppercase tracking-widest font-medium hover:border-brand-black transition-colors disabled:opacity-40"
            >
              Modifica
            </button>
            <button
              onClick={() => void handleConfirm()}
              disabled={loading}
              className="flex-1 sm:flex-none px-12 py-4 bg-brand-black text-white text-xs uppercase tracking-widest font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Invio…' : 'Conferma recesso'}
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && result && (
        <div className="border border-gray-100 p-8 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600 mb-4" strokeWidth={1.5} />
          <h2 className="text-2xl font-serif mb-3">Recesso registrato</h2>
          <p className="text-sm leading-7 text-gray-600 max-w-md mx-auto mb-6">
            Abbiamo ricevuto la tua dichiarazione di recesso. Un avviso di ricevimento è stato
            inviato a <strong>{form.email}</strong> e costituisce conferma su supporto durevole.
          </p>
          <div className="inline-block border border-gray-100 bg-gray-50 px-6 py-4 text-left text-sm">
            <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Riferimento</p>
            <p className="font-mono font-medium mb-3">{result.withdrawalNumber}</p>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Data e ora di ricezione</p>
            <p className="font-medium">{result.receivedAtLabel}</p>
          </div>
          <div className="mt-8">
            <Link
              to="/"
              className="inline-block px-12 py-4 bg-brand-black text-white text-xs uppercase tracking-widest font-medium hover:opacity-90 transition-opacity"
            >
              Torna alla home
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
