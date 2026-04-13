import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, addDoc, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Plus, RefreshCw, Users, Pencil, Trash2, Mail, Phone, Building2, BadgeCheck, Home, Package } from 'lucide-react';

type ClientStatus = 'lead' | 'active' | 'vip' | 'inactive';

interface ClientRecord {
  id: string;
  uid?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  status: ClientStatus;
  notes?: string;
}

const ADMIN_EMAILS = ['mmalinverno76@gmail.com', 'peewe75@gmail.com', 'mmalinverno@gmail.com'];
const STATUS_OPTIONS: ClientStatus[] = ['lead', 'active', 'vip', 'inactive'];

export default function CRM() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ClientStatus>('all');
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState<ClientStatus>('lead');
  const [notes, setNotes] = useState('');

  const isAdminUser = Boolean(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (!authLoading && user && !isAdminUser) {
      navigate('/');
    }
  }, [authLoading, isAdminUser, navigate, user]);

  const fetchClients = async () => {
    if (!isAdminUser) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'clients'));
      setClients(snapshot.docs.map((document) => ({
        id: document.id,
        ...(document.data() as Omit<ClientRecord, 'id'>),
      })));
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdminUser) {
      fetchClients();
    }
  }, [user, isAdminUser]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setSource('');
    setStatus('lead');
    setNotes('');
    setEditingClient(null);
  };

  const startEdit = (client: ClientRecord) => {
    setEditingClient(client);
    setName(client.name || '');
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setCompany(client.company || '');
    setSource(client.source || '');
    setStatus(client.status || 'lead');
    setNotes(client.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveClient = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdminUser) return;
    if (!name.trim()) {
      alert('Inserisci almeno il nome del cliente.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        company: company.trim() || null,
        source: source.trim() || null,
        status,
        notes: notes.trim() || null,
        updatedAt: serverTimestamp(),
      };

      if (editingClient) {
        await updateDoc(doc(db, 'clients', editingClient.id), payload);
      } else {
        await addDoc(collection(db, 'clients'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      resetForm();
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Errore durante il salvataggio del cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteClient = async (clientId: string) => {
    if (!isAdminUser) return;
    if (!window.confirm('Eliminare questo cliente?')) return;
    try {
      await deleteDoc(doc(db, 'clients', clientId));
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Errore durante l’eliminazione del cliente.');
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const searchTarget = `${client.name} ${client.email || ''} ${client.phone || ''} ${client.company || ''} ${client.notes || ''}`.toLowerCase();
      const matchesSearch = searchTarget.includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  const totalLeads = clients.filter((client) => client.status === 'lead').length;
  const totalVip = clients.filter((client) => client.status === 'vip').length;
  const totalActive = clients.filter((client) => client.status === 'active').length;

  if (authLoading || loading) {
    return <div className="pt-32 text-center">Loading...</div>;
  }

  if (!user) return null;

  if (!isAdminUser) {
    return (
      <main className="flex-grow pt-32 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
        <div className="bg-white border border-gray-200 p-8 text-center">
          <h1 className="text-3xl font-serif mb-3">Accesso non autorizzato</h1>
          <p className="text-gray-600">Questa area è riservata agli account amministratore.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-gray-500 mb-3">
            <Users className="w-4 h-4" />
            CRM
          </div>
          <h1 className="text-4xl md:text-6xl font-serif mb-3">Gestione Clienti</h1>
          <p className="text-gray-500 text-sm max-w-2xl">
            Centralizza clienti, note e stato commerciale in una vista unica per il team.
          </p>
        </div>

        <div className="flex gap-3">
          <Link to="/admin" className="border border-gray-200 px-4 py-2 text-xs uppercase tracking-widest hover:border-brand-black transition-colors flex items-center gap-2">
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
          <Link to="/admin/inventory" className="border border-gray-200 px-4 py-2 text-xs uppercase tracking-widest hover:border-brand-black transition-colors flex items-center gap-2">
            <Package className="w-4 h-4" />
            Magazzino
          </Link>
          <button
            onClick={fetchClients}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-brand-black px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Aggiorna</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="border border-gray-200 p-5 bg-white">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Totale clienti</p>
          <p className="text-3xl font-serif">{clients.length}</p>
        </div>
        <div className="border border-gray-200 p-5 bg-white">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Lead</p>
          <p className="text-3xl font-serif">{totalLeads}</p>
        </div>
        <div className="border border-gray-200 p-5 bg-white">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">VIP / Attivi</p>
          <p className="text-3xl font-serif">{totalVip + totalActive}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-50 p-6 border border-gray-100">
            <h2 className="text-lg font-serif mb-5">{editingClient ? 'Modifica Cliente' : 'Nuovo Cliente'}</h2>

            <form onSubmit={saveClient} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Nome</label>
                <input value={name} onChange={(event) => setName(event.target.value)} className="w-full border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Email</label>
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="w-full border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Telefono</label>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Azienda</label>
                <input value={company} onChange={(event) => setCompany(event.target.value)} className="w-full border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Fonte</label>
                <input value={source} onChange={(event) => setSource(event.target.value)} className="w-full border border-gray-300 p-2 text-sm" placeholder="Instagram, negozio, referral..." />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Stato</label>
                <select value={status} onChange={(event) => setStatus(event.target.value as ClientStatus)} className="w-full border border-gray-300 p-2 text-sm bg-white">
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Note</label>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full border border-gray-300 p-2 text-sm" />
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-brand-black text-white py-3 text-xs uppercase tracking-widest font-medium hover:bg-gray-900 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50">
                <Plus className="w-4 h-4" />
                <span>{editingClient ? 'Salva Cliente' : 'Aggiungi Cliente'}</span>
              </button>

              {editingClient && (
                <button type="button" onClick={resetForm} className="w-full bg-white text-gray-500 py-3 text-xs uppercase tracking-widest font-medium border border-gray-200 hover:text-brand-black hover:border-brand-black transition-colors">
                  Annulla Modifica
                </button>
              )}
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cerca cliente..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 text-sm focus:outline-none focus:border-brand-black"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | ClientStatus)}
              className="border border-gray-300 px-4 py-2 text-sm bg-white"
            >
              <option value="all">Tutti gli stati</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {filteredClients.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 border border-gray-100">
                <p className="text-gray-500 text-sm">Nessun cliente trovato.</p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <div key={client.id} className="border border-gray-100 bg-white p-5 flex flex-col md:flex-row md:items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-black text-white flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-serif">{client.name}</h3>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-2">
                          {client.email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{client.email}</span>}
                          {client.phone && <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{client.phone}</span>}
                          {client.company && <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{client.company}</span>}
                        </div>
                      </div>
                      <span className="inline-flex text-[10px] uppercase tracking-widest bg-gray-100 px-2 py-1">
                        {client.status}
                      </span>
                    </div>
                    {client.source && <p className="text-xs uppercase tracking-widest text-gray-400 mt-3">Fonte: {client.source}</p>}
                    {client.notes && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{client.notes}</p>}
                  </div>
                  <div className="flex md:flex-col gap-2">
                    <button onClick={() => startEdit(client)} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 border border-blue-200 flex items-center gap-1">
                      <Pencil className="w-4 h-4" />
                      Modifica
                    </button>
                    <button onClick={() => deleteClient(client.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 border border-red-200 flex items-center gap-1">
                      <Trash2 className="w-4 h-4" />
                      Elimina
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
