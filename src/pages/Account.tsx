import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { Package, Heart, Camera, User, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';

type Tab = 'orders' | 'wishlist' | 'tryons' | 'profile';

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pagato',
  awaiting_payment: 'Attesa pagamento',
  pending: 'In attesa',
  expired: 'Scaduto',
  failed: 'Fallito',
  refunded: 'Rimborsato',
};
const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  awaiting_payment: 'bg-amber-50 text-amber-700 border border-amber-200',
  pending: 'bg-gray-50 text-gray-500 border border-gray-200',
  expired: 'bg-red-50 text-red-600 border border-red-200',
  failed: 'bg-red-50 text-red-600 border border-red-200',
  refunded: 'bg-blue-50 text-blue-700 border border-blue-200',
};

interface UserOrder {
  id: string;
  orderNumber: string;
  paymentStatus: string;
  paymentMethod: string;
  totals: { total: number };
  items: { nameSnapshot: string; qty: number }[];
  createdAt: Timestamp | null;
}

function formatDate(ts: Timestamp | null): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function Account() {
  const { user } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(tabParam ?? 'orders');

  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login?redirect=/account'); return; }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as UserOrder))
        .sort((a, b) => {
          const at = a.createdAt?.toDate().getTime() ?? 0;
          const bt = b.createdAt?.toDate().getTime() ?? 0;
          return bt - at;
        });
      setOrders(docs);
      setOrdersLoading(false);
    });
    return () => unsub();
  }, [user]);

  const switchTab = (t: Tab) => {
    setTab(t);
    setSearchParams({ tab: t });
  };

  const saveProfile = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() || null });
      setSaveMsg('Profilo aggiornato.');
    } catch {
      setSaveMsg('Errore nel salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: 'orders', label: t('nav.orders'), icon: Package },
    { id: 'wishlist', label: t('favorites.title'), icon: Heart },
    { id: 'tryons', label: t('nav.myTryOns'), icon: Camera },
    { id: 'profile', label: t('nav.account'), icon: User },
  ];

  return (
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
      <h1 className="text-4xl font-serif mb-2">{t('nav.account')}</h1>
      <div className="w-12 h-[1px] bg-brand-black mb-2" />
      <p className="text-xs text-gray-400 mb-10">{user.email}</p>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-100 mb-10 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => switchTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors ${
              tab === id
                ? 'border-brand-black text-brand-black font-semibold'
                : 'border-transparent text-gray-400 hover:text-brand-black'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Orders */}
      {tab === 'orders' && (
        ordersLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400 mb-6">Nessun ordine ancora.</p>
            <Link
              to="/shop"
              className="text-xs uppercase tracking-widest underline underline-offset-4"
            >
              {t('favorites.exploreCta')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <Link
                key={order.id}
                to={`/account/orders/${order.id}`}
                className="border border-gray-100 p-5 flex items-center gap-4 hover:border-brand-black transition-colors"
              >
                <div className="flex-grow">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="font-mono text-sm font-medium">{order.orderNumber}</span>
                    <span
                      className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${
                        STATUS_STYLES[order.paymentStatus] ?? 'bg-gray-50 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatDate(order.createdAt)} ·{' '}
                    {order.items?.map(i => `${i.nameSnapshot}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium tabular-nums">
                    €{(order.totals?.total / 100).toFixed(2)}
                  </p>
                  {order.paymentStatus === 'awaiting_payment' && (
                    <span className="text-[10px] uppercase tracking-widest underline underline-offset-2 text-amber-600 mt-1 block">
                      Istruzioni pagamento
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </Link>
            ))}
          </div>
        )
      )}

      {/* Wishlist */}
      {tab === 'wishlist' && (
        favorites.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400 mb-6">{t('favorites.empty')}</p>
            <Link
              to="/shop"
              className="text-xs uppercase tracking-widest underline underline-offset-4"
            >
              {t('favorites.exploreCta')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {favorites.map(fav => (
              <div key={fav.id} className="group relative">
                <Link to={`/product/${fav.id}`}>
                  <div className="aspect-[3/4] bg-gray-50 overflow-hidden mb-3">
                    {fav.images?.[0] ? (
                      <img
                        src={fav.images[0]}
                        alt={fav.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100" />
                    )}
                  </div>
                  <p className="text-xs font-medium leading-tight">{fav.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    €{typeof fav.price === 'number' ? fav.price.toFixed(2) : fav.price}
                  </p>
                </Link>
                <button
                  onClick={() => void toggleFavorite(fav)}
                  className="mt-2 text-[10px] uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors underline underline-offset-2"
                >
                  {t('favorites.remove')}
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Try-ons */}
      {tab === 'tryons' && (
        <div className="text-center py-16 space-y-6">
          <Camera className="w-10 h-10 text-gray-200 mx-auto" />
          <div>
            <p className="text-sm text-gray-500 mb-2">{t('nav.myTryOns')}</p>
            <p className="text-xs text-gray-400 mb-8">
              Prova i capi virtualmente e salva i tuoi look preferiti.
            </p>
          </div>
          <Link
            to="/my-try-ons"
            className="inline-block px-10 py-4 bg-brand-black text-white text-xs uppercase tracking-widest hover:opacity-80 transition-opacity"
          >
            Apri camerino virtuale
          </Link>
        </div>
      )}

      {/* Profile */}
      {tab === 'profile' && (
        <div className="max-w-md space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
              Email
            </label>
            <p className="text-sm border border-gray-100 px-4 py-3 bg-gray-50 text-gray-400">
              {user.email}
            </p>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">
              Nome visualizzato
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Il tuo nome"
              className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand-black transition-colors"
            />
          </div>
          {saveMsg && (
            <p className={`text-xs ${saveMsg.includes('Errore') ? 'text-red-500' : 'text-emerald-600'}`}>
              {saveMsg}
            </p>
          )}
          <button
            onClick={() => void saveProfile()}
            disabled={saving}
            className="px-10 py-3 bg-brand-black text-white text-xs uppercase tracking-widest hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      )}
    </main>
  );
}
