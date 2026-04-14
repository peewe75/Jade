import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { LayoutGrid, Package, RefreshCw, Users, Heart, ExternalLink, Trash2 } from 'lucide-react';

const ADMIN_EMAILS = ['mmalinverno76@gmail.com', 'peewe75@gmail.com', 'mmalinverno@gmail.com', 'avv.sapone@hotmail.it'];

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [clientsCount, setClientsCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const { favorites, toggleFavorite } = useFavorites();
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
      <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="mb-12">
          <p className="text-xs uppercase tracking-[0.35em] text-gray-500 mb-3">User Dashboard</p>
          <h1 className="text-4xl md:text-6xl font-serif mb-3">Bentornata, <span className="italic">{user.displayName?.split(' ')[0] || 'User'}</span></h1>
          <p className="text-gray-500 text-sm max-w-2xl">
            Qui puoi trovare i tuoi articoli preferiti e gestire il tuo profilo.
          </p>
        </div>

        <section className="mt-12">
          <div className="flex items-center space-x-2 mb-8 border-b border-gray-100 pb-4">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            <h2 className="text-2xl font-serif tracking-tight">I miei Preferiti <span className="text-gray-300 ml-2">({favorites.length})</span></h2>
          </div>

          {favorites.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 p-12 text-center">
              <p className="text-gray-500 text-sm mb-6 uppercase tracking-widest">Non hai ancora salvato nulla.</p>
              <Link to="/shop" className="inline-block bg-brand-black text-white px-8 py-4 text-xs uppercase tracking-widest font-medium hover:opacity-80 transition-opacity">
                Vai allo Shop
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {favorites.map((product) => (
                <div key={product.id} className="group border border-gray-100 bg-white p-4 transition-all hover:border-brand-black">
                  <div className="relative aspect-[3/4] mb-4 overflow-hidden bg-gray-50">
                    <img 
                      src={product.images[0]} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => toggleFavorite(product)}
                        className="bg-white/90 p-2 shadow-sm text-red-500 hover:bg-white transition-colors"
                        title="Rimuovi dai preferiti"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium truncate mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">€{product.price.toFixed(2)}</p>
                  <Link 
                    to={`/product/${product.id}`}
                    className="flex items-center justify-center space-x-2 w-full py-2 border border-brand-black text-[10px] uppercase tracking-widest font-bold hover:bg-brand-black hover:text-white transition-all"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Vedi Prodotto</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
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
