import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { CheckCircle, Clock, Package, ExternalLink } from 'lucide-react';
import { db, functions } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const ADMIN_EMAILS = [
  'mmalinverno76@gmail.com',
  'peewe75@gmail.com',
  'mmalinverno@gmail.com',
  'avv.sapone@hotmail.it',
];

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  awaiting_payment: 'bg-amber-50 text-amber-700 border border-amber-200',
  pending: 'bg-gray-50 text-gray-600 border border-gray-200',
  expired: 'bg-red-50 text-red-600 border border-red-200',
  failed: 'bg-red-50 text-red-600 border border-red-200',
  refunded: 'bg-blue-50 text-blue-700 border border-blue-200',
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pagato',
  awaiting_payment: 'Attesa bonifico',
  pending: 'In attesa',
  expired: 'Scaduto',
  failed: 'Fallito',
  refunded: 'Rimborsato',
};

interface TimelineEvent {
  event?: string;
  status?: string;
  note?: string;
  at: Timestamp;
}

interface OrderItem {
  productId: string;
  variantId: string;
  qty: number;
  priceSnapshot: number;
  nameSnapshot: string;
  imageSnapshot?: string;
  sizeLabel?: string;
  colorLabel?: string;
}

interface OrderDoc {
  orderNumber: string;
  paymentMethod: string;
  paymentStatus: string;
  shippingStatus?: string;
  shippingTracking?: string;
  totals: { subtotal: number; total: number; shippingCost?: number };
  shippingAddress: {
    firstName: string; lastName: string; email: string;
    line1: string; city: string; postalCode: string; country: string;
  };
  items: OrderItem[];
  timeline: TimelineEvent[];
  bankDetails?: { iban: string; bic?: string; beneficiary: string };
  cryptoPaymentUrl?: string;
  cryptoStatus?: string;
  shippingPaymentLinkUrl?: string;
  shippingCourier?: string;
  shippingEta?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  locale: string;
  currency: string;
}

function formatDate(ts: Timestamp | undefined): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex gap-4 py-2 border-b border-gray-50">
      <span className="text-[10px] uppercase tracking-widest text-gray-400 w-32 shrink-0 mt-0.5">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Shipping quote form
  const [quoteForm, setQuoteForm] = useState({ courier: '', costEur: '0', eta: '' });
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteMsg, setQuoteMsg] = useState('');

  // Confirm shipping form
  const [trackingInput, setTrackingInput] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingMsg, setTrackingMsg] = useState('');

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (!id || !isAdmin) return;
    const unsub = onSnapshot(doc(db, 'orders', id), snap => {
      setOrder(snap.exists() ? (snap.data() as OrderDoc) : null);
      setLoading(false);
    });
    return () => unsub();
  }, [id, isAdmin]);

  const confirmBankTransfer = async () => {
    if (!id) return;
    setActionLoading(true);
    setActionMsg('');
    try {
      const fn = httpsCallable<{ orderId: string }, { success: boolean }>(
        functions,
        'adminConfirmBankTransfer'
      );
      await fn({ orderId: id });
      setActionMsg('Pagamento confermato.');
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : 'Errore.');
    } finally {
      setActionLoading(false);
    }
  };

  const submitQuote = async () => {
    if (!id) return;
    const costCents = Math.round(parseFloat(quoteForm.costEur || '0') * 100);
    if (!quoteForm.courier.trim() || !quoteForm.eta.trim() || isNaN(costCents)) return;
    setQuoteLoading(true);
    setQuoteMsg('');
    try {
      const fn = httpsCallable<
        { orderId: string; courier: string; costCents: number; eta: string },
        { paymentLinkUrl: string | null }
      >(functions, 'adminQuoteShipping');
      const res = await fn({ orderId: id, courier: quoteForm.courier, costCents, eta: quoteForm.eta });
      setQuoteMsg(res.data.paymentLinkUrl ? 'Preventivo inviato al cliente.' : 'Spedizione gratuita confermata.');
    } catch (err: unknown) {
      setQuoteMsg(err instanceof Error ? err.message : 'Errore.');
    } finally {
      setQuoteLoading(false);
    }
  };

  const confirmShipping = async () => {
    if (!id || !trackingInput.trim()) return;
    setTrackingLoading(true);
    setTrackingMsg('');
    try {
      const fn = httpsCallable<
        { orderId: string; trackingNumber: string; carrier?: string },
        { success: boolean }
      >(functions, 'adminConfirmShipping');
      await fn({ orderId: id, trackingNumber: trackingInput.trim(), carrier: order?.shippingCourier });
      setTrackingMsg('Spedizione confermata. Email tracking inviata al cliente.');
    } catch (err: unknown) {
      setTrackingMsg(err instanceof Error ? err.message : 'Errore.');
    } finally {
      setTrackingLoading(false);
    }
  };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <main className="flex-grow pt-24 pb-16 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="flex-grow pt-24 pb-16 px-4 flex flex-col items-center justify-center">
        <p className="text-sm text-gray-400 mb-6">Ordine non trovato.</p>
        <Link to="/admin/orders" className="text-xs uppercase tracking-widest underline underline-offset-4">
          Torna agli ordini
        </Link>
      </main>
    );
  }

  const timeline = [...(order.timeline ?? [])].reverse();

  return (
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-6">
        <Link to="/admin" className="hover:text-brand-black transition-colors">Dashboard</Link>
        {' / '}
        <Link to="/admin/orders" className="hover:text-brand-black transition-colors">Ordini</Link>
        {' / '}
        <span className="text-brand-black font-mono">{order.orderNumber}</span>
      </p>

      <div className="flex flex-wrap items-start gap-4 mb-2">
        <h1 className="text-3xl font-serif font-mono">{order.orderNumber}</h1>
        <span
          className={`text-[10px] uppercase tracking-widest px-2 py-1 mt-1 ${
            STATUS_STYLES[order.paymentStatus] ?? 'bg-gray-50 text-gray-500 border border-gray-200'
          }`}
        >
          {STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
        </span>
      </div>
      <div className="w-12 h-[1px] bg-brand-black mb-10" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-10">
          {/* Order info */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Dettagli ordine</h2>
            <Row label="Creato" value={formatDate(order.createdAt)} />
            <Row label="Aggiornato" value={formatDate(order.updatedAt)} />
            <Row label="Pagamento"
              value={
                order.paymentMethod === 'stripe' ? 'Carta (Stripe)' :
                order.paymentMethod === 'bank' ? 'Bonifico bancario' : 'Criptovaluta'
              }
            />
            <Row label="Stato pag." value={STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus} />
            {order.shippingStatus && (
              <Row label="Spedizione" value={order.shippingStatus} />
            )}
            {order.shippingTracking && (
              <Row label="Tracking" value={<span className="font-mono">{order.shippingTracking}</span>} />
            )}
            {order.cryptoStatus && (
              <Row label="Stato crypto" value={<span className="capitalize">{order.cryptoStatus}</span>} />
            )}
            {order.cryptoPaymentUrl && (
              <Row
                label="Link crypto"
                value={
                  <a
                    href={order.cryptoPaymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline underline-offset-2 text-xs"
                  >
                    NOWPayments <ExternalLink className="w-3 h-3" />
                  </a>
                }
              />
            )}
          </section>

          {/* Customer */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Cliente</h2>
            <Row label="Nome" value={`${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`} />
            <Row label="Email" value={order.shippingAddress.email} />
            <Row label="Indirizzo" value={order.shippingAddress.line1} />
            <Row
              label="Città"
              value={`${order.shippingAddress.postalCode} ${order.shippingAddress.city} · ${order.shippingAddress.country}`}
            />
          </section>

          {/* Items */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Articoli</h2>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex gap-3 border border-gray-100 p-3">
                  {item.imageSnapshot && (
                    <div className="w-14 h-16 shrink-0 bg-gray-50 overflow-hidden">
                      <img
                        src={item.imageSnapshot}
                        alt={item.nameSnapshot}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="flex-grow">
                    <p className="text-xs font-medium">{item.nameSnapshot}</p>
                    {(item.sizeLabel || item.colorLabel) && (
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                        {[item.sizeLabel, item.colorLabel].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {item.qty}× · €{(item.priceSnapshot / 100).toFixed(2)}
                    </p>
                  </div>
                  <p className="text-xs font-medium tabular-nums">
                    €{((item.priceSnapshot * item.qty) / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-gray-100 mt-4 pt-4 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotale</span>
                <span className="tabular-nums">€{(order.totals.subtotal / 100).toFixed(2)}</span>
              </div>
              {order.totals.shippingCost != null && (
                <div className="flex justify-between text-gray-500">
                  <span>Spedizione</span>
                  <span className="tabular-nums">€{(order.totals.shippingCost / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-1">
                <span>Totale</span>
                <span className="tabular-nums">€{(order.totals.total / 100).toFixed(2)}</span>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Timeline</h2>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-400">Nessun evento.</p>
            ) : (
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-1.5 top-2 bottom-2 w-px bg-gray-100" />
                {timeline.map((ev, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[18px] top-1 w-2 h-2 rounded-full bg-brand-black" />
                    <p className="text-xs font-medium capitalize">{(ev.event ?? (ev as any).status ?? '').replace(/_/g, ' ')}</p>
                    {ev.note && <p className="text-xs text-gray-500 mt-0.5">{ev.note}</p>}
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(ev.at)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right: actions */}
        <div className="space-y-6">
          {/* Bank transfer confirmation */}
          {order.paymentMethod === 'bank' && order.paymentStatus === 'awaiting_payment' && (
            <div className="border border-gray-100 p-5">
              <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" />
                Conferma bonifico
              </h3>
              {order.bankDetails && (
                <div className="mb-4 text-xs text-gray-500 space-y-1">
                  <p>IBAN: <span className="font-mono">{(order.bankDetails as any).iban}</span></p>
                  {(order.bankDetails as any).bic && (
                    <p>BIC: <span className="font-mono">{(order.bankDetails as any).bic}</span></p>
                  )}
                </div>
              )}
              {actionMsg && (
                <p className="text-xs mb-3 text-emerald-700">{actionMsg}</p>
              )}
              <button
                onClick={() => void confirmBankTransfer()}
                disabled={actionLoading}
                className="w-full py-3 bg-brand-black text-white text-xs uppercase tracking-widest hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {actionLoading ? 'Elaborazione...' : 'Segna come pagato'}
              </button>
            </div>
          )}

          {/* Shipping section — always visible so admin can ship regardless of payment status */}
          <div className="border border-gray-100 p-5">
              <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                <Package className="w-3.5 h-3.5" />
                Spedizione
              </h3>

              {/* No quote yet / pending → show quote + direct ship form */}
              {(!order.shippingStatus || order.shippingStatus === 'pending') && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1">Corriere</label>
                    <input
                      type="text"
                      value={quoteForm.courier}
                      onChange={e => setQuoteForm(p => ({ ...p, courier: e.target.value }))}
                      placeholder="es. GLS, DHL, SDA..."
                      className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-brand-black"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1">Costo €</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={quoteForm.costEur}
                        onChange={e => setQuoteForm(p => ({ ...p, costEur: e.target.value }))}
                        className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-brand-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1">Tempi</label>
                      <input
                        type="text"
                        value={quoteForm.eta}
                        onChange={e => setQuoteForm(p => ({ ...p, eta: e.target.value }))}
                        placeholder="3–5 gg"
                        className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-brand-black"
                      />
                    </div>
                  </div>
                  {quoteMsg && (
                    <p className={`text-xs ${quoteMsg.includes('Errore') ? 'text-red-500' : 'text-emerald-600'}`}>
                      {quoteMsg}
                    </p>
                  )}
                  <button
                    onClick={() => void submitQuote()}
                    disabled={quoteLoading || !quoteForm.courier.trim() || !quoteForm.eta.trim()}
                    className="w-full py-3 bg-brand-black text-white text-xs uppercase tracking-widest hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    {quoteLoading ? 'Invio...' : 'Invia preventivo spedizione'}
                  </button>
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Oppure segna subito come spedito</p>
                    <input
                      type="text"
                      value={trackingInput}
                      onChange={e => setTrackingInput(e.target.value)}
                      placeholder="Numero tracking (obbligatorio)"
                      className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-brand-black mb-2"
                    />
                    {trackingMsg && (
                      <p className={`text-xs mb-2 ${trackingMsg.includes('Errore') ? 'text-red-500' : 'text-emerald-600'}`}>
                        {trackingMsg}
                      </p>
                    )}
                    <button
                      onClick={() => void confirmShipping()}
                      disabled={trackingLoading || !trackingInput.trim() || !quoteForm.courier.trim()}
                      className="w-full py-3 border border-brand-black text-brand-black text-xs uppercase tracking-widest hover:bg-brand-black hover:text-white transition-colors disabled:opacity-40"
                    >
                      {trackingLoading ? 'Conferma...' : 'Segna spedito + invia tracking'}
                    </button>
                    {!quoteForm.courier.trim() && <p className="text-[10px] text-gray-400 mt-1">Inserisci corriere sopra per abilitare</p>}
                  </div>
                </div>
              )}

              {/* Awaiting shipping payment */}
              {order.shippingStatus === 'awaiting_payment' && (
                <div className="space-y-3">
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
                    In attesa del pagamento spedizione da parte del cliente.
                  </p>
                  {order.shippingPaymentLinkUrl && (
                    <a
                      href={order.shippingPaymentLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline underline-offset-2 text-gray-500 break-all"
                    >
                      {order.shippingPaymentLinkUrl}
                    </a>
                  )}
                  {order.shippingCourier && (
                    <p className="text-xs text-gray-500">{order.shippingCourier} · {order.shippingEta}</p>
                  )}
                </div>
              )}

              {/* Ready to ship → confirm with tracking */}
              {order.shippingStatus === 'ready_to_ship' && (
                <div className="space-y-3">
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2">
                    Pronto per la spedizione{order.shippingCourier ? ` · ${order.shippingCourier}` : ''}.
                  </p>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-1">
                      Numero tracking
                    </label>
                    <input
                      type="text"
                      value={trackingInput}
                      onChange={e => setTrackingInput(e.target.value)}
                      placeholder="es. 1Z999AA10123456784"
                      className="w-full border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-brand-black"
                    />
                  </div>
                  {trackingMsg && (
                    <p className={`text-xs ${trackingMsg.includes('Errore') ? 'text-red-500' : 'text-emerald-600'}`}>
                      {trackingMsg}
                    </p>
                  )}
                  <button
                    onClick={() => void confirmShipping()}
                    disabled={trackingLoading || !trackingInput.trim()}
                    className="w-full py-3 bg-brand-black text-white text-xs uppercase tracking-widest hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    {trackingLoading ? 'Conferma...' : 'Conferma spedizione'}
                  </button>
                </div>
              )}

              {/* Shipped */}
              {order.shippingStatus === 'shipped' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">
                    Spedito via <strong>{order.shippingCourier}</strong>
                  </p>
                  {order.shippingTracking && (
                    <p className="text-xs font-mono bg-gray-50 px-3 py-2 border border-gray-100">
                      {order.shippingTracking}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Status summary card */}
          <div className="border border-gray-100 p-5">
            <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Riepilogo
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Totale</span>
                <span className="font-medium tabular-nums">
                  €{(order.totals.total / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Articoli</span>
                <span>{order.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Lingua</span>
                <span className="uppercase">{order.locale}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
