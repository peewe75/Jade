import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { LayoutGrid, Package, RefreshCw, Users } from 'lucide-react';

const ADMIN_EMAILS = ['mmalinverno76@gmail.com', 'peewe75@gmail.com', 'mmalinverno@gmail.com'];

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [clientsCount, setClientsCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchCounts = async () => {
      if (!isAdminUser) return;
      setLoading(true);
      try {
        const [clientsSnapshot, productsSnapshot, categoriesSnapshot] = await Promise.all([
          getDocs(collection(db, 'clients')),
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'categories')),
        ]);

        setClientsCount(clientsSnapshot.size);
        setProductsCount(productsSnapshot.size);
        setCategoriesCount(categoriesSnapshot.size);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user && isAdminUser) {
      fetchCounts();
    }
  }, [isAdminUser, user]);

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

  const cards = [
    {
      title: 'CRM Clienti',
      description: 'Gestisci clienti, note e stato commerciale.',
      href: '/admin/crm',
      icon: Users,
      count: clientsCount,
    },
    {
      title: 'Magazzino',
      description: 'Gestisci prodotti, immagini e categorie.',
      href: '/admin/inventory',
      icon: Package,
      count: productsCount,
    },
    {
      title: 'Categorie',
      description: 'Controlla la struttura del catalogo.',
      href: '/admin/inventory#categories',
      icon: LayoutGrid,
      count: categoriesCount,
    },
  ];

  return (
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="mb-12 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500 mb-3">Admin Hub</p>
          <h1 className="text-4xl md:text-6xl font-serif mb-3">CRM & Magazzino</h1>
          <p className="text-gray-500 text-sm max-w-2xl">
            Entra nelle due aree operative: gestione clienti e gestione prodotti.
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-brand-black px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Aggiorna dati</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.href}
              className="group border border-gray-200 bg-white p-6 hover:border-brand-black transition-colors"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-full bg-brand-black text-white flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-2xl font-serif text-gray-300 group-hover:text-brand-black transition-colors">
                  {String(card.count).padStart(2, '0')}
                </span>
              </div>
              <h2 className="text-2xl font-serif mb-3">{card.title}</h2>
              <p className="text-sm text-gray-500 leading-relaxed">{card.description}</p>
              <div className="mt-6 text-xs uppercase tracking-widest font-medium text-brand-black">
                Apri sezione
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 border border-gray-200 bg-gray-50 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">Accesso rapido</p>
        <p className="text-sm text-gray-600">
          Le due sezioni sono separate per tenere chiara la parte clienti e la parte inventario.
        </p>
      </div>
    </main>
  );
}
