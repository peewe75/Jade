import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { Camera, Trash2, X } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface TryOnArchiveItem {
  id: string;
  productId?: string;
  productName?: string;
  imageUrl?: string;
  status?: string;
  modelUsed?: string;
  createdAt?: { toMillis?: () => number } | null;
  completedAt?: { toMillis?: () => number } | null;
}

export default function MyTryOns() {
  const { user } = useAuth();
  const [items, setItems] = useState<TryOnArchiveItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [selectedImage, setSelectedImage] = useState<TryOnArchiveItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const archiveQuery = query(
      collection(db, 'vto_jobs'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      archiveQuery,
      (snapshot) => {
        const nextItems = snapshot.docs
          .map((jobDoc) => ({
            id: jobDoc.id,
            ...jobDoc.data(),
          }) as TryOnArchiveItem)
          .filter((item) => item.status === 'completed' && typeof item.imageUrl === 'string' && item.imageUrl.length > 0);

        setItems(nextItems);
        setIsLoading(false);
      },
      (error) => {
        console.error('My try-on archive error:', error);
        setItems([]);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const productOptions = Array.from(
    new Set(items.map((item) => item.productName).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));

  const filteredItems = [...items]
    .filter((item) => {
      const matchesProduct =
        productFilter === 'all' ? true : item.productName === productFilter;
      const matchesSearch =
        search.trim().length === 0
          ? true
          : (item.productName || '').toLowerCase().includes(search.trim().toLowerCase());

      return matchesProduct && matchesSearch;
    })
    .sort((a, b) => {
      const aTime = a.completedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.completedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
      return sortBy === 'newest' ? bTime - aTime : aTime - bTime;
    });

  const handleDelete = async (item: TryOnArchiveItem) => {
    if (!user) return;
    const confirmed = window.confirm(`Delete try-on for "${item.productName || 'this look'}"?`);
    if (!confirmed) return;

    try {
      setDeletingId(item.id);
      await deleteDoc(doc(db, 'vto_jobs', item.id));
      if (selectedImage?.id === item.id) {
        setSelectedImage(null);
      }
    } catch (error) {
      console.error('Delete try-on error:', error);
      window.alert('Delete failed. Try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) {
    return (
      <main className="flex-grow bg-brand-white px-4 pb-16 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl border border-black/8 bg-[#faf8f3] p-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-brand-gold">Virtual Dressing Room</p>
          <h1 className="mt-4 text-4xl md:text-5xl">My Try-Ons</h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-brand-gray-dark">
            Sign in first. Then full archive, filters, saved looks all here.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-block bg-brand-black px-8 py-3 text-xs uppercase tracking-[0.28em] text-white transition-opacity hover:opacity-85"
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow bg-brand-white px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl border-b border-black/6 pb-10">
        <p className="text-[10px] uppercase tracking-[0.35em] text-brand-gold">Virtual Dressing Room</p>
        <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl">My Try-Ons</h1>
            <p className="mt-4 text-sm leading-7 text-brand-gray-dark md:text-base">
              Full archive of every saved AI fitting. Filter by product. Search fast. Delete what you no longer want.
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-block border border-brand-black px-7 py-3 text-xs uppercase tracking-[0.26em] transition-colors hover:bg-brand-black hover:text-white"
          >
            New Try-On
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl py-10">
        <div className="grid gap-4 border border-black/8 bg-[#fcfbf8] p-5 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.28em] text-gray-500">Search</span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Product name"
              className="w-full border border-black/10 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-brand-black"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.28em] text-gray-500">Product</span>
            <select
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value)}
              className="w-full border border-black/10 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-brand-black"
            >
              <option value="all">All products</option>
              {productOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.28em] text-gray-500">Sort</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as 'newest' | 'oldest')}
              className="w-full border border-black/10 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-brand-black"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mx-auto max-w-7xl">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-pulse space-y-3">
                <div className="aspect-[3/4] bg-gray-100" />
                <div className="h-4 w-2/3 bg-gray-100" />
                <div className="h-3 w-1/3 bg-gray-100" />
              </div>
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="group border border-black/8 bg-white"
              >
                <button
                  type="button"
                  onClick={() => setSelectedImage(item)}
                  className="relative block aspect-[3/4] w-full overflow-hidden bg-gray-100"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.productName || 'Try-on AI'}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent opacity-90" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-left text-white">
                    <p className="text-[10px] uppercase tracking-[0.26em] text-white/65">Saved look</p>
                    <p className="mt-1 text-sm uppercase tracking-[0.16em]">{item.productName || 'Virtual try-on'}</p>
                  </div>
                </button>

                <div className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.26em] text-gray-500">Product</p>
                      <p className="mt-2 text-sm leading-6 text-brand-black">{item.productName || 'Unknown product'}</p>
                    </div>
                    {item.productId && (
                      <Link
                        to={`/product/${item.productId}`}
                        className="shrink-0 text-[10px] uppercase tracking-[0.24em] text-gray-500 transition-colors hover:text-brand-black"
                      >
                        Open
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-black/6 pt-4">
                    <button
                      type="button"
                      onClick={() => setSelectedImage(item)}
                      className="text-[10px] uppercase tracking-[0.24em] text-gray-500 transition-colors hover:text-brand-black"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item)}
                      disabled={deletingId === item.id}
                      className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-red-500 transition-opacity hover:opacity-75 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingId === item.id ? 'Deleting' : 'Delete'}
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="border border-black/8 bg-[#faf8f3] px-6 py-10 text-center">
            <Camera className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-4 text-[10px] uppercase tracking-[0.32em] text-gray-500">Empty archive</p>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-brand-gray-dark">
              No try-ons match current filters. Clear filters or generate new look from product page.
            </p>
          </div>
        )}
      </section>

      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/82 backdrop-blur-sm"
              onClick={() => setSelectedImage(null)}
              aria-label="Close try-on preview"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative z-10 w-full max-w-5xl overflow-hidden bg-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
            >
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/75"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="max-h-[85vh] overflow-hidden bg-black">
                  <img
                    src={selectedImage.imageUrl}
                    alt={selectedImage.productName || 'Try-on AI'}
                    className="h-full max-h-[85vh] w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex flex-col justify-between p-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Try-on details</p>
                    <h2 className="mt-4 text-3xl">{selectedImage.productName || 'Saved look'}</h2>
                    <p className="mt-4 text-sm leading-7 text-brand-gray-dark">
                      Full archive view. Keep best looks. Delete rest. Open product anytime for another generation.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {selectedImage.productId && (
                      <Link
                        to={`/product/${selectedImage.productId}`}
                        onClick={() => setSelectedImage(null)}
                        className="block w-full border border-brand-black px-5 py-3 text-center text-xs uppercase tracking-[0.25em] transition-colors hover:bg-brand-black hover:text-white"
                      >
                        Open Product
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDelete(selectedImage)}
                      disabled={deletingId === selectedImage.id}
                      className="block w-full bg-brand-black px-5 py-3 text-center text-xs uppercase tracking-[0.25em] text-white transition-opacity hover:opacity-85 disabled:opacity-40"
                    >
                      {deletingId === selectedImage.id ? 'Deleting' : 'Delete Try-On'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
