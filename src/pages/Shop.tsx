import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Check, Heart } from 'lucide-react';
import { useFavorites } from '../contexts/FavoritesContext';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useTranslation } from 'react-i18next';
import { getProductText } from '../lib/i18nProduct';

interface ProductVariant {
  id: string;
  size?: string;
  color?: string;
  stock: number;
  reserved?: number;
  priceOverride?: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  basePrice?: number;
  images: string[];
  category: string;
  tags?: string[];
  status?: string;
  variants?: ProductVariant[];
  translations?: { it?: { name?: string }; en?: { name?: string } };
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const { toggleFavorite, isFavorite } = useFavorites();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { t, i18n } = useTranslation();
  const [quickAddingId, setQuickAddingId] = useState<string | null>(null);
  const [quickAddedId, setQuickAddedId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch dynamic categories
    const fetchCategories = async () => {
      try {
        const catSnapshot = await getDocs(collection(db, 'categories'));
        const cats = catSnapshot.docs.map(doc => doc.data().name);
        setCategories(['All', ...cats]);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    
    fetchCategories();

    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      const visible = productsData.filter(p => !p.status || p.status === 'active' || p.status === 'sold_out');
      setProducts(visible);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredProducts = activeCategory === 'All' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  const getFirstAvailableVariant = (product: Product): ProductVariant | null => {
    const variants = product.variants && product.variants.length > 0
      ? product.variants
      : [{ id: 'legacy-0', stock: 1, reserved: 0 }];

    return variants.find(variant => variant.stock - (variant.reserved ?? 0) > 0) ?? null;
  };

  const handleQuickAdd = async (product: Product) => {
    const variant = getFirstAvailableVariant(product);
    if (product.status === 'sold_out' || !variant) return;

    setQuickAddingId(product.id);
    try {
      const displayName = getProductText(product, i18n.language, 'name') || product.name;
      const priceSnapshot = variant.priceOverride
        ?? product.basePrice
        ?? Math.round(product.price * 100);

      await addItem({
        productId: product.id,
        variantId: variant.id,
        qty: 1,
        priceSnapshot,
        nameSnapshot: displayName,
        imageSnapshot: product.images?.[0] || '',
        ...(variant.size ? { sizeLabel: variant.size } : {}),
        ...(variant.color ? { colorLabel: variant.color } : {}),
      });

      setQuickAddedId(product.id);
      window.setTimeout(() => {
        setQuickAddedId(current => current === product.id ? null : current);
      }, 1600);
    } catch (error) {
      console.error('Quick add error:', error);
      alert(t('cart.addError'));
    } finally {
      setQuickAddingId(null);
    }
  };

  return (
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-7xl font-serif mb-4 tracking-tight">{t('shop.title')} <span className="italic">{t('shop.titleAll')}</span></h1>
        <div className="w-16 h-[1px] bg-brand-black mx-auto mb-6"></div>
        <p className="text-brand-gray-dark text-[10px] tracking-[0.4em] uppercase">{t('shop.subtitle')}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-16">
        {/* Sidebar / Filters */}
        <div className="w-full md:w-56 shrink-0 md:sticky md:top-24 h-fit">
          <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold mb-8 text-brand-black border-b border-gray-100 pb-2">{t('shop.collections')}</h3>
          <ul className="space-y-4 text-xs text-brand-gray-dark flex flex-row md:flex-col overflow-x-auto md:overflow-visible pb-4 md:pb-0 gap-6 md:gap-0 uppercase tracking-widest">
            {categories.map(category => (
              <li key={category} className="shrink-0">
                <button
                  onClick={() => setActiveCategory(category)}
                  className={`relative transition-all duration-300 hover:text-brand-black ${activeCategory === category ? 'text-brand-black font-semibold' : ''}`}
                >
                  {category === 'All' ? t('shop.all') : category}
                  {activeCategory === category && (
                    <motion.div layoutId="category-underline" className="absolute -bottom-1 left-0 right-0 h-[1px] bg-brand-black" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="animate-pulse">
                  <div className="aspect-[3/4] bg-gray-200 mb-4"></div>
                  <div className="h-4 bg-gray-200 w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 w-1/4"></div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((product, index) => {
                const quickVariant = getFirstAvailableVariant(product);
                const quickUnavailable = product.status === 'sold_out' || !quickVariant;
                const isAdding = quickAddingId === product.id;
                const isAdded = quickAddedId === product.id;

                return (
                <motion.div 
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="group cursor-pointer"
                >
                  <Link to={`/product/${product.id}`} className="block">
                    <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 mb-4">
                      {product.images && product.images.length > 0 ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs uppercase tracking-widest">No Image</div>
                      )}
                      
                      {product.status === 'sold_out' ? (
                        <div className="absolute top-4 left-4 bg-black text-white px-3 py-1 text-[10px] uppercase tracking-widest font-medium">
                          {t('product.soldOut')}
                        </div>
                      ) : product.tags && product.tags[0] && (
                        <div className="absolute top-4 left-4 bg-white px-3 py-1 text-[10px] uppercase tracking-widest font-medium">
                          {product.tags[0]}
                        </div>
                      )}

                      {user && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite({
                              id: product.id,
                              name: product.name,
                              price: product.price,
                              images: product.images
                            });
                          }}
                          className="absolute top-4 right-4 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110"
                        >
                          <Heart 
                            className={`w-4 h-4 transition-colors ${isFavorite(product.id) ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} 
                          />
                        </button>
                      )}
                      
                      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-0 sm:translate-y-full sm:group-hover:translate-y-0 transition-transform duration-300 ease-out">
                        <button 
                          type="button"
                          disabled={quickUnavailable || isAdding}
                          className="flex w-full items-center justify-center gap-2 bg-white/90 backdrop-blur-sm text-brand-black py-3 text-xs uppercase tracking-widest font-medium hover:bg-brand-black hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white/90 disabled:hover:text-brand-black"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleQuickAdd(product);
                          }}
                        >
                          {isAdded && <Check className="h-4 w-4" />}
                          {isAdded ? t('cart.added') : isAdding ? t('common.loading') : quickUnavailable ? t('product.soldOut') : t('shop.quickAdd')}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-medium mb-1">{getProductText(product, i18n.language, 'name') || product.name}</h3>
                        <p className="text-sm text-gray-500">€{product.price.toFixed(2)}</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-24 bg-gray-50 border border-gray-100 flex flex-col items-center justify-center">
              <h3 className="text-xl font-serif mb-2">{t('shop.noProducts')}</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                {activeCategory === 'All'
                  ? t('shop.noProductsAll')
                  : t('shop.noProductsCategory')}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
