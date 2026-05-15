import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Plus, RefreshCw, Users, Pencil, Trash2, Mail, Phone, Building2, BadgeCheck, Home, Package, UserRoundCheck, CheckCircle2, Circle, FileText, X, Activity, AlertCircle, Clock, User, Heart, Tag as TagIcon } from 'lucide-react';
import type { Client, ClientStage, ClientActivity, ClientTask, ClientTag } from '../types/crm';
import { STAGE_OPTIONS, STAGE_LABELS } from '../types/crm';
import { convertTimestamp, createActivity as createActivityFn, createClient as createClientFn, createTask as createTaskFn, updateTask as updateTaskFn, deleteTask as deleteTaskFn, getAllTags, getClientActivities, getClientTasks, importUsersToClients, getAllUsers, normalizeClientEmail, updateClientOwner, updateClientTags, isOverdue, isDueToday, type UserRecord } from '../lib/crm';
import { Timestamp } from 'firebase/firestore';

const ADMIN_EMAILS = ['mmalinverno76@gmail.com', 'peewe75@gmail.com', 'mmalinverno@gmail.com', 'avv.sapone@hotmail.it'];

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  stage: ClientStage;
  notes: string;
  tags: string[];
  ownerId: string;
  nextFollowUpAt: string;
}

function getInitialFormData(): ClientFormData {
  return {
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'admin-manual',
    stage: 'new_lead',
    notes: '',
    tags: [],
    ownerId: '',
    nextFollowUpAt: '',
  };
}

function parseDateInput(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function formatDateInput(value?: Date): string {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function CRM() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | ClientStage>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [siteOnlyFilter, setSiteOnlyFilter] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activities, setActivities] = useState<ClientActivity[]>([]);
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [availableTags, setAvailableTags] = useState<ClientTag[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueAt, setNewTaskDueAt] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newNoteBody, setNewNoteBody] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#000000');
  const [form, setForm] = useState<ClientFormData>(getInitialFormData());
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [favoritesCounts, setFavoritesCounts] = useState<Record<string, number>>({});

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
      const snapshot = await getDocs(query(collection(db, 'clients'), orderBy('updatedAt', 'desc')));
      const docs = snapshot.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          uid: data.uid,
          name: data.name || '',
          email: data.email,
          normalizedEmail: data.normalizedEmail,
          phone: data.phone,
          company: data.company,
          source: data.source,
          stage: data.stage || (data.status as ClientStage) || 'new_lead',
          tags: data.tags || [],
          ownerId: data.ownerId,
          preferredCategories: data.preferredCategories,
          preferredSizes: data.preferredSizes,
          lastContactAt: convertTimestamp(data.lastContactAt),
          nextFollowUpAt: convertTimestamp(data.nextFollowUpAt),
          lastActivityAt: convertTimestamp(data.lastActivityAt),
          totalOrders: data.totalOrders || 0,
          totalSpent: data.totalSpent || 0,
          notesCount: data.notesCount || 0,
          photoURL: data.photoURL,
          notes: data.notes,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as Client;
      });
      const dedupedDocs = Array.from(
        docs.reduce((byEmail, client) => {
          const key = normalizeClientEmail(client.normalizedEmail || client.email) || `id:${client.id}`;
          if (!byEmail.has(key)) byEmail.set(key, client);
          return byEmail;
        }, new Map<string, Client>()).values()
      );
      setClients(dedupedDocs);

      // Fetch favorites counts for all users to show badges
      try {
        const favsSnapshot = await getDocs(collection(db, 'user_favorites'));
        const counts: Record<string, number> = {};
        favsSnapshot.docs.forEach(doc => {
          const items = doc.data().items || [];
          if (items.length > 0) {
            counts[doc.id] = items.length;
          }
        });
        setFavoritesCounts(counts);
      } catch (favErr) {
        console.error('Error fetching favorites counts:', favErr);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const tags = await getAllTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const syncClientsFromUsers = async () => {
    if (!isAdminUser || !user) return;
    setIsSyncing(true);
    try {
      const count = await importUsersToClients(user.uid);
      alert(`Import completato: aggiunti ${count} contatti dal registro utenti.`);
      fetchClients();
    } catch (error) {
      console.error('Error syncing clients from users:', error);
      alert('Errore durante la sincronizzazione utenti -> CRM.');
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchClientDetails = async (clientId: string) => {
    try {
      const [acts, tks] = await Promise.all([
        getClientActivities(clientId),
        getClientTasks(clientId),
      ]);
      setActivities(acts);
      setTasks(tks);
    } catch (error) {
      console.error('Error fetching client details:', error);
    }
  };

  useEffect(() => {
    if (user && isAdminUser) {
      fetchClients();
      fetchTags();
      fetchUsers();
    }
  }, [user, isAdminUser]);

  useEffect(() => {
    if (selectedClient) {
      fetchClientDetails(selectedClient.id);
    }
  }, [selectedClient]);

  const resetForm = () => {
    setForm(getInitialFormData());
    setEditingClient(null);
  };

  const startEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      source: client.source || 'admin-manual',
      stage: client.stage || 'new_lead',
      notes: client.notes || '',
      tags: client.tags || [],
      ownerId: client.ownerId || '',
      nextFollowUpAt: formatDateInput(client.nextFollowUpAt),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectClient = (client: Client) => {
    setSelectedClient(client);
  };

  const closeDetail = () => {
    setSelectedClient(null);
    setActivities([]);
    setTasks([]);
  };

  const saveClient = async (event: FormEvent) => {
    event.preventDefault();
    if (!isAdminUser) return;
    if (!form.name.trim()) {
      alert('Inserisci almeno il nome del cliente.');
      return;
    }

    setIsSaving(true);
    try {
      const normalizedEmail = normalizeClientEmail(form.email);
      const duplicateClient = normalizedEmail
        ? clients.find((client) =>
            client.id !== editingClient?.id &&
            normalizeClientEmail(client.normalizedEmail || client.email) === normalizedEmail
          )
        : undefined;

      if (duplicateClient) {
        alert(`Esiste gia un contatto con questa email: ${duplicateClient.name || duplicateClient.email}. Modifica quello esistente.`);
        startEdit(duplicateClient);
        return;
      }

      const payload = {
        name: form.name.trim(),
        email: normalizedEmail,
        normalizedEmail,
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        source: form.source.trim() || null,
        stage: form.stage,
        tags: form.tags.length > 0 ? form.tags : null,
        ownerId: form.ownerId || null,
        notes: form.notes.trim() || null,
        nextFollowUpAt: form.nextFollowUpAt ? Timestamp.fromDate(parseDateInput(form.nextFollowUpAt)) : null,
        updatedAt: serverTimestamp(),
      };

      if (editingClient) {
        await updateDoc(doc(db, 'clients', editingClient.id), payload);
        if (user) {
          await createActivityFn(editingClient.id, 'profile_updated', 'Profilo cliente aggiornato', user.uid);
        }
        if (selectedClient?.id === editingClient.id) {
          setSelectedClient({
            ...selectedClient,
            ...payload,
            nextFollowUpAt: form.nextFollowUpAt ? parseDateInput(form.nextFollowUpAt) : undefined,
          });
        }
      } else {
        const clientId = await createClientFn(payload as any);
        if (user) {
          await createActivityFn(clientId, 'created', 'Cliente creato manualmente', user.uid);
        }
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
      if (selectedClient?.id === clientId) {
        closeDetail();
      }
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Errore durante eliminazione del cliente.');
    }
  };

  const changeStage = async (clientId: string, newStage: ClientStage) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'clients', clientId), {
        stage: newStage,
        updatedAt: serverTimestamp(),
      });
      await createActivityFn(clientId, 'stage_changed', `Stage cambiato a ${STAGE_LABELS[newStage]}`, user.uid, undefined, { newStage });
      fetchClients();
      if (selectedClient?.id === clientId) {
        setSelectedClient({ ...selectedClient, stage: newStage });
      }
    } catch (error) {
      console.error('Error changing stage:', error);
    }
  };

  const addNote = async () => {
    if (!selectedClient || !user || !newNoteBody.trim()) return;
    try {
      await createActivityFn(selectedClient.id, 'note_added', 'Nota aggiunta', user.uid, newNoteBody.trim());
      setSelectedClient({
        ...selectedClient,
        notesCount: selectedClient.notesCount + 1,
        lastActivityAt: new Date(),
      });
      setNewNoteBody('');
      setShowNoteModal(false);
      fetchClients();
      fetchClientDetails(selectedClient.id);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const addTask = async () => {
    if (!selectedClient || !newTaskTitle.trim()) return;
    try {
      const taskId = await createTaskFn(
        selectedClient.id,
        newTaskTitle.trim(),
        newTaskAssignee || undefined,
        newTaskDueAt ? new Date(newTaskDueAt) : undefined
      );
      if (user) {
        await createActivityFn(selectedClient.id, 'task_created', 'Task creato', user.uid, newTaskTitle.trim());
      }
      setNewTaskTitle('');
      setNewTaskDueAt('');
      setNewTaskAssignee('');
      setShowTaskModal(false);
      fetchClients();
      fetchClientDetails(selectedClient.id);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const completeTask = async (taskId: string) => {
    if (!selectedClient || !user) return;
    try {
      await updateTaskFn(taskId, { status: 'completed' });
      await createActivityFn(selectedClient.id, 'task_completed', 'Task completato', user.uid);
      fetchClients();
      fetchClientDetails(selectedClient.id);
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const removeTask = async (taskId: string) => {
    if (!window.confirm('Eliminare questo task?')) return;
    try {
      await deleteTaskFn(taskId);
      if (selectedClient) {
        fetchClients();
        fetchClientDetails(selectedClient.id);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const scheduleFollowUp = async (clientId: string, date: string) => {
    if (!date) return;
    try {
      const followUpDate = parseDateInput(date);
      await updateDoc(doc(db, 'clients', clientId), {
        nextFollowUpAt: Timestamp.fromDate(followUpDate),
        updatedAt: serverTimestamp(),
      });
      if (user) {
        await createActivityFn(clientId, 'profile_updated', 'Follow-up pianificato', user.uid, date);
      }
      if (selectedClient?.id === clientId) {
        setSelectedClient({ ...selectedClient, nextFollowUpAt: followUpDate });
        fetchClientDetails(clientId);
      }
      fetchClients();
    } catch (error) {
      console.error('Error scheduling follow-up:', error);
    }
  };

  const filteredClients = useMemo(() => {
    let filtered = clients;
    if (quickFilter === 'overdue') {
      filtered = filtered.filter(c => isOverdue(c));
    } else if (quickFilter === 'due_today') {
      filtered = filtered.filter(c => isDueToday(c));
    } else if (quickFilter === 'new_lead') {
      filtered = filtered.filter(c => c.stage === 'new_lead');
    }
    return filtered.filter((client) => {
      const searchTarget = `${client.name} ${client.email || ''} ${client.phone || ''} ${client.company || ''} ${client.notes || ''}`.toLowerCase();
      const matchesSearch = searchTarget.includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === 'all' || client.stage === stageFilter;
      const matchesSource = sourceFilter === 'all' || client.source === sourceFilter;
      const matchesOwner = ownerFilter === 'all' || client.ownerId === ownerFilter;
      const matchesTag = tagFilter === 'all' || (client.tags?.includes(tagFilter));
      const matchesSiteOnly = !siteOnlyFilter || client.source === 'site' || client.source === 'google';
      return matchesSearch && matchesStage && matchesSource && matchesOwner && matchesTag && matchesSiteOnly;
    });
  }, [clients, searchQuery, stageFilter, sourceFilter, ownerFilter, tagFilter, siteOnlyFilter, quickFilter]);

  const kpiWidgets = useMemo(() => {
    const overdueCount = clients.filter(c => isOverdue(c)).length;
    const dueTodayCount = clients.filter(c => isDueToday(c)).length;
    const newLeadCount = clients.filter(c => c.stage === 'new_lead').length;
    return { overdueCount, dueTodayCount, newLeadCount };
  }, [clients]);

  const stageCounts = useMemo(() => {
    const counts: Record<ClientStage, number> = {
      new_lead: 0,
      contacted: 0,
      qualified: 0,
      customer: 0,
      vip: 0,
      inactive: 0,
    };
    clients.forEach(c => {
      if (c.stage && counts[c.stage] !== undefined) {
        counts[c.stage]++;
      }
    });
    return counts;
  }, [clients]);

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    clients.forEach(c => { if (c.source) sources.add(c.source); });
    return Array.from(sources).sort();
  }, [clients]);

  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>();
    clients.forEach(c => { if (c.ownerId) owners.add(c.ownerId); });
    return Array.from(owners).sort();
  }, [clients]);

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
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-gray-500 mb-3">
            <Users className="w-4 h-4" />
            CRM
          </div>
          <h1 className="text-4xl md:text-6xl font-serif mb-3">Gestione Clienti</h1>
          <p className="text-gray-500 text-sm max-w-2xl">
            Pipeline commerciale con lead, attivita e task per ogni cliente.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to="/admin" className="border border-gray-200 px-4 py-2 text-xs uppercase tracking-widest hover:border-brand-black transition-colors flex items-center gap-2">
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
          <Link to="/admin/inventory" className="border border-gray-200 px-4 py-2 text-xs uppercase tracking-widest hover:border-brand-black transition-colors flex items-center gap-2">
            <Package className="w-4 h-4" />
            Magazzino
          </Link>
          <button
            onClick={syncClientsFromUsers}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-brand-black px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors disabled:opacity-50"
          >
            <UserRoundCheck className="w-4 h-4" />
            <span>{isSyncing ? 'Sincronizzo...' : 'Importa utenti'}</span>
          </button>
          <button
            onClick={fetchClients}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-brand-black px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Aggiorna</span>
          </button>
        </div>
      </div>

      {quickFilter && (
        <div className="mb-6 flex items-center gap-3 bg-gray-100 px-4 py-2">
          <span className="text-sm">Filtro attivo:</span>
          <span className="text-xs uppercase bg-brand-black text-white px-2 py-1">{quickFilter}</span>
          <button onClick={() => setQuickFilter(null)} className="text-xs text-red-600 hover:underline">Rimuovi</button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <button onClick={() => setQuickFilter('overdue')} className={`border p-4 text-left transition-colors hover:border-red-400 ${quickFilter === 'overdue' ? 'border-red-600 bg-red-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-red-600 mb-1">
            <AlertCircle className="w-3 h-3" />
            Scaduti
          </div>
          <p className="text-2xl font-serif">{kpiWidgets.overdueCount}</p>
        </button>
        <button onClick={() => setQuickFilter('due_today')} className={`border p-4 text-left transition-colors hover:border-yellow-400 ${quickFilter === 'due_today' ? 'border-yellow-600 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-yellow-600 mb-1">
            <Clock className="w-3 h-3" />
            Oggi
          </div>
          <p className="text-2xl font-serif">{kpiWidgets.dueTodayCount}</p>
        </button>
        <button onClick={() => setQuickFilter('new_lead')} className={`border p-4 text-left transition-colors hover:border-green-400 ${quickFilter === 'new_lead' ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-green-600 mb-1">
            <Users className="w-3 h-3" />
            Nuovi Lead
          </div>
          <p className="text-2xl font-serif">{kpiWidgets.newLeadCount}</p>
        </button>
        <button onClick={() => setStageFilter('all')} className={`border p-4 text-left transition-colors ${stageFilter === 'all' ? 'border-brand-black bg-gray-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Totale</p>
          <p className="text-2xl font-serif">{clients.length}</p>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {STAGE_OPTIONS.filter(s => s !== 'inactive').map((stage) => (
          <button key={stage} onClick={() => setStageFilter(stage)} className={`border p-3 text-left transition-colors ${stageFilter === stage ? 'border-brand-black bg-gray-50' : 'border-gray-200 bg-white'}`}>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">{STAGE_LABELS[stage]}</p>
            <p className="text-xl font-serif">{stageCounts[stage]}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-50 p-6 border border-gray-100">
            <h2 className="text-lg font-serif mb-5">{editingClient ? 'Modifica Cliente' : 'Nuovo Cliente'}</h2>

            <form onSubmit={saveClient} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Nome *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="w-full border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Telefono</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Azienda</label>
                <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Fonte</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="w-full border border-gray-300 p-2 text-sm bg-white">
                  <option value="admin-manual">Manuale</option>
                  <option value="site">Sito</option>
                  <option value="google">Google</option>
                  <option value="import-users">Import</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Stage</label>
                <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as ClientStage })} className="w-full border border-gray-300 p-2 text-sm bg-white">
                  {STAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{STAGE_LABELS[option]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Owner</label>
                <select value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })} className="w-full border border-gray-300 p-2 text-sm bg-white">
                  <option value="">Non assegnato</option>
                  {users.map((u) => (<option key={u.id} value={u.id}>{u.email}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Tag</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <label key={tag.id} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={form.tags.includes(tag.name)}
                        onChange={(e) => {
                          const newTags = e.target.checked
                            ? [...form.tags, tag.name]
                            : form.tags.filter(t => t !== tag.name);
                          setForm({ ...form, tags: newTags });
                        }}
                        className="w-3 h-3"
                      />
                      <span>{tag.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Prossimo follow-up</label>
                <input type="date" value={form.nextFollowUpAt} onChange={(e) => setForm({ ...form, nextFollowUpAt: e.target.value })} className="w-full border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Note</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} className="w-full border border-gray-300 p-2 text-sm" />
              </div>

              <button type="submit" disabled={isSaving} className="w-full bg-brand-black text-white py-3 text-xs uppercase tracking-widest font-medium hover:bg-gray-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
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
          <div className="flex flex-col gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca cliente..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 text-sm focus:outline-none focus:border-brand-black"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as 'all' | ClientStage)} className="border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="all">Tutti gli stage</option>
                {STAGE_OPTIONS.map((o) => (<option key={o} value={o}>{STAGE_LABELS[o]}</option>))}
              </select>
              <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="all">Tutti gli owner</option>
                <option value="">Non assegnato</option>
                {users.map((u) => (<option key={u.id} value={u.id}>{u.email}</option>))}
              </select>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="all">Tutte le fonti</option>
                {uniqueSources.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
              <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="border border-gray-300 px-3 py-2 text-sm bg-white">
                <option value="all">Tutti i tag</option>
                {availableTags.map((t) => (<option key={t.id} value={t.name}>{t.name}</option>))}
              </select>
              <button onClick={() => setShowTagModal(true)} className="border border-gray-200 px-3 py-2 text-sm bg-white hover:bg-gray-50 flex items-center gap-1">
                <TagIcon className="w-3 h-3" />
                Gestione Tag
              </button>
              <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 bg-white">
                <input type="checkbox" checked={siteOnlyFilter} onChange={(e) => setSiteOnlyFilter(e.target.checked)} className="w-4 h-4" />
                Solo registrati
              </label>
            </div>
          </div>

          <div className="space-y-4">
            {filteredClients.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 border border-gray-100">
                <p className="text-gray-500 text-sm">Nessun cliente trovato.</p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => selectClient(client)}
                  className={`border bg-white p-5 flex flex-col md:flex-row md:items-start gap-4 cursor-pointer transition-colors ${selectedClient?.id === client.id ? 'border-brand-black ring-1 ring-brand-black' : 'border-gray-100 hover:border-gray-300'}`}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 text-brand-black flex items-center justify-center shrink-0 overflow-hidden border border-gray-100 shadow-sm">
                    {client.photoURL ? (
                      <img src={client.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-serif flex items-center gap-2">
                          {client.name}
                          {client.uid && favoritesCounts[client.uid] > 0 && (
                            <div className="flex items-center gap-1 bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100 shadow-sm animate-pulse-slow" title={`${favoritesCounts[client.uid]} prodotti nei preferiti`}>
                              <Heart className="w-3 h-3 fill-red-600" />
                              <span className="text-[10px] font-bold font-sans">{favoritesCounts[client.uid]}</span>
                            </div>
                          )}
                        </h3>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-2">
                          {client.email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{client.email}</span>}
                          {client.phone && <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{client.phone}</span>}
                          {client.company && <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{client.company}</span>}
                        </div>
                      </div>
                      <span className="inline-flex text-[10px] uppercase tracking-widest bg-gray-100 px-2 py-1">
                        {STAGE_LABELS[client.stage] || client.stage}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {client.ownerId && (
                        <span className="flex items-center gap-1 text-xs">
                          <User className="w-3 h-3" />
                          {users.find(u => u.id === client.ownerId)?.email || client.ownerId}
                        </span>
                      )}
                      {client.tags && client.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {client.tags.map(tagName => {
                            const tag = availableTags.find(t => t.name === tagName);
                            return (
                              <span key={tagName} className="text-[10px] px-1" style={{ backgroundColor: tag?.color || '#666', color: '#fff' }}>
                                {tagName}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {client.source && <p className="text-xs uppercase tracking-widest text-gray-400 mt-2">Fonte: {client.source}</p>}
                    {client.notes && <p className="text-sm text-gray-600 mt-2 leading-relaxed line-clamp-2">{client.notes}</p>}
                  </div>
                  <div className="flex md:flex-col gap-2">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(client); }} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 border border-blue-200 flex items-center gap-1">
                      <Pencil className="w-4 h-4" />
                      Modifica
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteClient(client.id); }} className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 border border-red-200 flex items-center gap-1">
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

      {selectedClient && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closeDetail} />
          <div className="relative w-full max-w-xl bg-white h-full overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-serif">{selectedClient.name}</h2>
              <button onClick={closeDetail} className="p-2 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Stage</p>
                  <select
                    value={selectedClient.stage}
                    onChange={(e) => changeStage(selectedClient.id, e.target.value as ClientStage)}
                    className="w-full border border-gray-300 p-2 text-sm bg-white"
                  >
                    {STAGE_OPTIONS.map((o) => (<option key={o} value={o}>{STAGE_LABELS[o]}</option>))}
                  </select>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Owner</p>
                  <select
                    value={selectedClient.ownerId || ''}
                    onChange={async (e) => {
                      if (!user) return;
                      const newOwner = e.target.value || null;
                      try {
                        await updateClientOwner(selectedClient.id, newOwner, user.uid);
                        setSelectedClient({ ...selectedClient, ownerId: newOwner || undefined });
                        fetchClients();
                      } catch (error) {
                        console.error('Error updating owner:', error);
                      }
                    }}
                    className="w-full border border-gray-300 p-2 text-sm bg-white"
                  >
                    <option value="">Non assegnato</option>
                    {users.map((u) => (<option key={u.id} value={u.id}>{u.email}</option>))}
                  </select>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Prossimo follow-up</p>
                <input
                  type="date"
                  value={formatDateInput(selectedClient.nextFollowUpAt)}
                  onChange={(e) => scheduleFollowUp(selectedClient.id, e.target.value)}
                  className="w-full border border-gray-300 p-2 text-sm"
                />
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Tag</p>
                <div className="flex flex-wrap gap-2">
                  {availableTags.filter(t => selectedClient.tags?.includes(t.name)).map((tag) => (
                    <span key={tag.id} className="text-xs px-2 py-1" style={{ backgroundColor: tag.color || '#000', color: '#fff' }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Contatto</p>
                <div className="space-y-2 text-sm">
                  {selectedClient.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{selectedClient.email}</div>}
                  {selectedClient.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{selectedClient.phone}</div>}
                  {selectedClient.company && <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" />{selectedClient.company}</div>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="border p-3">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Ordini</p>
                  <p className="text-xl font-serif">{selectedClient.totalOrders}</p>
                </div>
                <div className="border p-3">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Speso</p>
                  <p className="text-xl font-serif">{selectedClient.totalSpent}</p>
                </div>
                <div className="border p-3">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Note</p>
                  <p className="text-xl font-serif">{selectedClient.notesCount}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowNoteModal(true)} className="flex-1 flex items-center justify-center gap-2 border border-gray-200 px-3 py-2 text-xs uppercase hover:bg-gray-50">
                  <FileText className="w-4 h-4" />
                  Nota
                </button>
                <button onClick={() => setShowTaskModal(true)} className="flex-1 flex items-center justify-center gap-2 border border-gray-200 px-3 py-2 text-xs uppercase hover:bg-gray-50">
                  <CheckCircle2 className="w-4 h-4" />
                  Task
                </button>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Task</h3>
                <div className="space-y-2">
                  {tasks.length === 0 ? (
                    <p className="text-sm text-gray-400">Nessun task</p>
                  ) : (
                    tasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-3 p-3 bg-gray-50">
                        <button onClick={() => task.status !== 'completed' && completeTask(task.id)} className="mt-0.5">
                          {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-gray-300" />}
                        </button>
                        <div className="flex-1">
                          <p className={`text-sm ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>{task.title}</p>
                          {task.dueAt && <p className="text-xs text-gray-400 mt-1">Scadenza: {task.dueAt.toLocaleDateString()}</p>}
                        </div>
                        <button onClick={() => removeTask(task.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-3">Attivita</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {activities.length === 0 ? (
                    <p className="text-sm text-gray-400">Nessuna attivita</p>
                  ) : (
                    activities.map((act) => (
                      <div key={act.id} className="border-l-2 border-gray-200 pl-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Activity className="w-3 h-3" />
                          <span>{act.type}</span>
                          <span>-</span>
                          <span>{act.createdAt ? act.createdAt.toLocaleString() : ''}</span>
                        </div>
                        <p className="text-sm mt-1">{act.title}</p>
                        {act.body && <p className="text-xs text-gray-500 mt-1">{act.body}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNoteModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowNoteModal(false)} />
          <div className="relative bg-white p-6 w-full max-w-md">
            <h3 className="text-lg font-serif mb-4">Aggiungi Nota</h3>
            <textarea
              value={newNoteBody}
              onChange={(e) => setNewNoteBody(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 p-2 text-sm mb-4"
              placeholder="Testo della nota..."
            />
            <div className="flex gap-2">
              <button onClick={() => setShowNoteModal(false)} className="flex-1 border border-gray-200 py-2 text-xs uppercase">Annulla</button>
              <button onClick={addNote} className="flex-1 bg-brand-black text-white py-2 text-xs uppercase">Salva</button>
            </div>
          </div>
        </div>
      )}

      {showTaskModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowTaskModal(false)} />
          <div className="relative bg-white p-6 w-full max-w-md">
            <h3 className="text-lg font-serif mb-4">Crea Task</h3>
            <input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full border border-gray-300 p-2 text-sm mb-4"
              placeholder="Titolo del task..."
            />
            <select value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)} className="w-full border border-gray-300 p-2 text-sm mb-4 bg-white">
              <option value="">Assegna a...</option>
              {users.map((u) => (<option key={u.id} value={u.id}>{u.email}</option>))}
            </select>
            <input
              type="date"
              value={newTaskDueAt}
              onChange={(e) => setNewTaskDueAt(e.target.value)}
              className="w-full border border-gray-300 p-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setShowTaskModal(false)} className="flex-1 border border-gray-200 py-2 text-xs uppercase">Annulla</button>
              <button onClick={addTask} className="flex-1 bg-brand-black text-white py-2 text-xs uppercase">Crea</button>
            </div>
          </div>
        </div>
      )}

      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowTagModal(false)} />
          <div className="relative bg-white p-6 w-full max-w-md">
            <h3 className="text-lg font-serif mb-4">Gestione Tag</h3>
            <div className="space-y-4 mb-4">
              <div className="flex gap-2">
                <input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Nome tag..."
                  className="flex-1 border border-gray-300 p-2 text-sm"
                />
                <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} className="w-10 h-10 border" />
              </div>
              <button
                onClick={async () => {
                  if (!newTagName.trim()) return;
                  try {
                    const { createTag } = await import('../lib/crm');
                    await createTag(newTagName.trim(), newTagColor);
                    setNewTagName('');
                    setNewTagColor('#000000');
                    fetchTags();
                  } catch (error) {
                    console.error('Error creating tag:', error);
                  }
                }}
                className="w-full bg-brand-black text-white py-2 text-xs uppercase"
              >
                Crea Tag
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {availableTags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between p-2 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color || '#000' }} />
                    <span className="text-sm">{tag.name}</span>
                  </div>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Eliminare tag "${tag.name}"?`)) return;
                      try {
                        const { deleteTag } = await import('../lib/crm');
                        await deleteTag(tag.id);
                        fetchTags();
                      } catch (error) {
                        console.error('Error deleting tag:', error);
                      }
                    }}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Elimina
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowTagModal(false)} className="flex-1 border border-gray-200 py-2 text-xs uppercase">Chiudi</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
