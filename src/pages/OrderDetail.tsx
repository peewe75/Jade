import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { ChevronLeft, ExternalLink, Package } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

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
  awaiting_payment: 'Attesa pagamento',
  pending: 'In attesa',
  expired: 'Scaduto',
  failed: 'Fallito',
  refunded: 'Rimborsato',
};

const SHIPPING_LABELS: Record<string, string> = {
  pending: 'In preparazione',
  awaiting_payment: 'Attesa pagamento spedizione',
  ready_to_ship: 'Pronto alla spedizione',
  shipped: 'Spedito',
  delivered: 'Consegnato',
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
  sizeLabel?: string | null;
  colorLabel?: string | null;
}

interface OrderDoc {
  userId: string | null;
  orderNumber: string;
  paymentMethod: string;
  paymentStatus: string;
  shippingStatus?: string;
  shippingTracking?: string;
  shippingCourier?: string;
  shippingEta?: string;
  shippingPaymentLinkUrl?: string;
  totals: { subtotal: number; total: number; shipping?: number; shippingCost?: number };
  shippingAddress: {
    firstName: string; lastName: string; email: string;
    line1: string; city: string; postalCode: string; country: string;
  };
  items: OrderItem[];
  timeline: TimelineEvent[];
  bankDetails?: { iban: string; bic?: string; beneficiary: string };
  cryptoPaymentUrl?: string;
  cryptoStatus?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  locale: string;
  currency: string;
}

function formatDate(ts: Timestamp | undefined | null): string {
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

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=/account/orders/${id ?? ''}`);
      return;
    }
    if (!id) return;
    const unsub = onSnapshot(
      doc(db, 'orders', id),
      snap => {
        if (!snap.exists()) {
          setOrder(null);
        } else {
          const data = snap.data() as OrderDoc;
          if (data.userId && data.userId !== user.uid) {
            setDenied(true);
            setOrder(null);
          } else {
            setOrder(data);
          }
        }
        setLoading(false);
      },
      () => {
        setDenied(true);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [id, user, navigate]);

  if (!user) return null;

  if (loading) {
    return (
      <main className="flex-grow pt-24 pb-16 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (denied || !order) {
    return (
      <main className="flex-grow pt-24 pb-16 px-4 flex flex-col items-center justify-center">
        <p className="text-sm text-gray-400 mb-6">
          {denied ? 'Non hai accesso a questo ordine.' : 'Ordine non trovato.'}
        </p>
        <Link
          to="/account?tab=orders"
          className="text-xs uppercase tracking-widest underline underline-offset-4"
        >
          Torna ai miei ordini
        </Link>
      </main>
    );
  }

  const timeline = [...(order.timeline ?? [])].reverse();
  const shippingCost = order.totals.shippingCost ?? order.totals.shipping;

  return (
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
      <Link
        to="/account?tab=orders"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-gray-400 hover:text-brand-black transition-colors mb-6"
      >
        <ChevronLeft className="w-3 h-3" />
        I miei ordini
      </Link>

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

      {/* Action banners */}
      {order.paymentStatus === 'awaiting_payment' && order.paymentMethod === 'bank' && (
        <div className="mb-8 border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-xs text-amber-800 mb-2">
            In attesa del bonifico. Clicca sotto per le istruzioni.
          </p>
          <Link
            to={`/checkout/pending?orderId=${id ?? ''}`}
            className="text-xs uppercase tracking-widest underline underline-offset-2 text-amber-900"
          >
            Vedi istruzioni di pagamento
          </Link>
        </div>
      )}
      {order.paymentStatus === 'awaiting_payment' && order.paymentMethod === 'crypto' && order.cryptoPaymentUrl && (
        <div className="mb-8 border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-xs text-amber-800 mb-2">
            In attesa del pagamento crypto.
          </p>
          <a
            href={order.cryptoPaymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs uppercase tracking-widest underline underline-offset-2 text-amber-900"
          >
            Apri NOWPayments <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
      {order.shippingStatus === 'awaiting_payment' && order.shippingPaymentLinkUrl && (
        <div className="mb-8 border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-xs text-amber-800 mb-2">
            Preventivo spedizione pronto: {order.shippingCourier}
            {order.shippingEta ? ` · ${order.shippingEta}` : ''}.
          </p>
          <a
            href={order.shippingPaymentLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs uppercase tracking-widest underline underline-offset-2 text-amber-900"
          >
            Paga spedizione <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-10">
          {/* Order info */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Dettagli ordine</h2>
            <Row label="Creato" value={formatDate(order.createdAt)} />
            <Row label="Aggiornato" value={formatDate(order.updatedAt)} />
            <Row
              label="Pagamento"
              value={
                order.paymentMethod === 'stripe' ? 'Carta (Stripe)' :
                order.paymentMethod === 'bank' ? 'Bonifico bancario' : 'Criptovaluta'
              }
            />
            <Row label="Stato pag." value={STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus} />
            {order.shippingStatus && (
              <Row
                label="Spedizione"
                value={SHIPPING_LABELS[order.shippingStatus] ?? order.shippingStatus}
              />
            )}
            {order.shippingCourier && (
              <Row label="Corriere" value={order.shippingCourier} />
            )}
            {order.shippingTracking && (
              <Row label="Tracking" value={<span className="font-mono">{order.shippingTracking}</span>} />
            )}
          </section>

          {/* Address */}
          <section>
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Indirizzo di spedizione</h2>
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

            <div className="border-t border-gray-100 mt-4 pt-4 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotale</span>
                <span className="tabular-nums">€{(order.totals.subtotal / 100).toFixed(2)}</span>
              </div>
              {shippingCost != null && (
                <div className="flex justify-between text-gray-500">
                  <span>Spedizione</span>
                  <span className="tabular-nums">€{(shippingCost / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-1">
                <span>Totale</span>
                <span className="tabular-nums">€{(order.totals.total / 100).toFixed(2)}</span>
              </div>
            </div>
          </section>

          {/* Timeline */}
          {timeline.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-4">Cronologia</h2>
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-1.5 top-2 bottom-2 w-px bg-gray-100" />
                {timeline.map((ev, i) => {
                  const label = ev.event ?? ev.status ?? '';
                  return (
                    <div key={i} className="relative">
                      <div className="absolute -left-[18px] top-1 w-2 h-2 rounded-full bg-brand-black" />
                      <p className="text-xs font-medium capitalize">{label.replace(/_/g, ' ')}</p>
                      {ev.note && <p className="text-xs text-gray-500 mt-0.5">{ev.note}</p>}
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(ev.at)}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Right: summary */}
        <div className="space-y-6">
          <div className="border border-gray-100 p-5">
            <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <Package className="w-3.5 h-3.5" />
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
                <span className="text-gray-400">Numero</span>
                <span className="font-mono">{order.orderNumber}</span>
              </div>
            </div>
          </div>

          {order.bankDetails && order.paymentStatus === 'awaiting_payment' && (
            <div className="border border-gray-100 p-5">
              <h3 className="text-xs uppercase tracking-widest text-gray-400 mb-4">
                Coordinate bonifico
              </h3>
              <div className="space-y-1 text-xs text-gray-600">
                <p>Beneficiario: <strong>{order.bankDetails.beneficiary}</strong></p>
                <p>IBAN: <span className="font-mono">{order.bankDetails.iban}</span></p>
                {order.bankDetails.bic && (
                  <p>BIC: <span className="font-mono">{order.bankDetails.bic}</span></p>
                )}
                <p className="pt-2 text-gray-400">
                  Causale: <span className="font-mono">{order.orderNumber}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
