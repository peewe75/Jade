import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { Download, ChevronRight } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const ADMIN_EMAILS = [
  'mmalinverno76@gmail.com',
  'peewe75@gmail.com',
  'mmalinverno@gmail.com',
  'avv.sapone@hotmail.it',
];

interface AdminOrder {
  id: string;
  orderNumber: string;
  paymentMethod: string;
  paymentStatus: string;
  totals: { total: number };
  shippingAddress: { firstName: string; lastName: string; email: string; city: string; country: string };
  createdAt: Timestamp | null;
}

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

const METHOD_LABELS: Record<string, string> = {
  stripe: 'Carta',
  bank: 'Bonifico',
  crypto: 'Crypto',
};

function formatDate(ts: Timestamp | null): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function exportCSV(orders: AdminOrder[]) {
  const header = ['Ordine', 'Data', 'Cliente', 'Email', 'Città', 'Metodo', 'Stato', 'Totale'];
  const rows = orders.map(o => [
    o.orderNumber,
    o.createdAt?.toDate().toLocaleDateString('it-IT') ?? '',
    `${o.shippingAddress?.firstName ?? ''} ${o.shippingAddress?.lastName ?? ''}`.trim(),
    o.shippingAddress?.email ?? '',
    `${o.shippingAddress?.city ?? ''} ${o.shippingAddress?.country ?? ''}`.trim(),
    METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod,
    STATUS_LABELS[o.paymentStatus] ?? o.paymentStatus,
    `€${(o.totals?.total / 100).toFixed(2)}`,
  ]);
  const csv = [header, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ordini-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }

    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(500)
    );
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminOrder)));
      setLoading(false);
    });
    return () => unsub();
  }, [isAdmin, navigate]);

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.paymentStatus !== statusFilter) return false;
    if (methodFilter !== 'all' && o.paymentMethod !== methodFilter) return false;
    return true;
  });

  const selectClass =
    'border border-gray-200 px-3 py-2 text-xs uppercase tracking-widest bg-white focus:outline-none focus:border-brand-black';

  if (!isAdmin) return null;

  return (
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="flex items-end justify-between mb-2">
        <div>
          <h1 className="text-4xl font-serif">Ordini</h1>
          <div className="w-12 h-[1px] bg-brand-black mt-2" />
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-2 border border-gray-200 px-4 py-2 text-xs uppercase tracking-widest hover:border-brand-black transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
      </div>

      {/* Breadcrumb */}
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-8">
        <Link to="/admin" className="hover:text-brand-black transition-colors">Dashboard</Link>
        {' / '}
        <span className="text-brand-black">Ordini</span>
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass}>
          <option value="all">Tutti gli stati</option>
          <option value="paid">Pagato</option>
          <option value="awaiting_payment">Attesa bonifico</option>
          <option value="pending">In attesa</option>
          <option value="expired">Scaduto</option>
          <option value="refunded">Rimborsato</option>
        </select>
        <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className={selectClass}>
          <option value="all">Tutti i metodi</option>
          <option value="stripe">Carta</option>
          <option value="bank">Bonifico</option>
          <option value="crypto">Crypto</option>
        </select>
        <span className="self-center text-xs text-gray-400">
          {filtered.length} ordini
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center">Nessun ordine trovato.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                {['Ordine', 'Data', 'Cliente', 'Metodo', 'Stato', 'Totale', ''].map(h => (
                  <th
                    key={h}
                    className="text-left text-[10px] uppercase tracking-widest text-gray-400 pb-3 pr-4 font-normal"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr
                  key={order.id}
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 pr-4 font-mono text-xs font-medium">
                    {order.orderNumber}
                  </td>
                  <td className="py-3 pr-4 text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-xs font-medium">
                      {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}
                    </p>
                    <p className="text-[10px] text-gray-400">{order.shippingAddress?.email}</p>
                  </td>
                  <td className="py-3 pr-4 text-xs text-gray-500">
                    {METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 ${
                        STATUS_STYLES[order.paymentStatus] ?? 'bg-gray-50 text-gray-500 border border-gray-200'
                      }`}
                    >
                      {STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs font-medium tabular-nums">
                    €{(order.totals?.total / 100).toFixed(2)}
                  </td>
                  <td className="py-3">
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
