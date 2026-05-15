import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { GripVertical, Heart } from 'lucide-react';
import { useFavorites } from '../contexts/FavoritesContext';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { getProductText } from '../lib/i18nProduct';

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  tags?: string[];
  featuredOrder?: number;
}

interface FeaturedProductRecord {
  id: string;
  name?: string;
  price?: number | string;
  images?: string[];
  image?: string;
  tags?: string[];
  featured?: boolean;
  featuredOrder?: number;
}

const fallbackProducts = [
  {
    id: 1,
    name: "The Miami Slip Dress",
    price: "€129.00",
    image: "https://picsum.photos/seed/miamidress/800/1067",
    tag: "Trending"
  },
  {
    id: 2,
    name: "Garda Linen Blazer",
    price: "€189.00",
    image: "https://picsum.photos/seed/gardablazer/800/1067",
  },
  {
    id: 3,
    name: "Rodeo Drive Top",
    price: "€89.00",
    image: "https://picsum.photos/seed/rodeotop/800/1067",
    tag: "New In"
  },
  {
    id: 4,
    name: "Colline Avenue Trousers",
    price: "€149.00",
    image: "https://picsum.photos/seed/collinetrousers/800/1067",
  }
];

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toggleFavorite, isFavorite } = useFavorites();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'products'));
        const featuredProducts = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as FeaturedProductRecord[];

        const sortedFeaturedProducts = featuredProducts
          .filter((product): product is FeaturedProductRecord & { name: string; featured: true } => {
            return product.featured === true && typeof product.name === 'string';
          })
          .sort((left, right) => {
            const leftOrder = typeof left.featuredOrder === 'number' ? left.featuredOrder : Number.MAX_SAFE_INTEGER;
            const rightOrder = typeof right.featuredOrder === 'number' ? right.featuredOrder : Number.MAX_SAFE_INTEGER;
            return leftOrder - rightOrder || left.name.localeCompare(right.name);
          })
          .map((product) => ({
            id: product.id,
            name: product.name,
            price: typeof product.price === 'number' ? product.price : Number(product.price ?? 0),
            images: Array.isArray(product.images) ? product.images : (product.image ? [product.image] : []),
            tags: product.tags,
            featuredOrder: product.featuredOrder,
          }));

        setProducts(sortedFeaturedProducts);
      } catch (error) {
        console.error('Error fetching featured products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  const displayProducts = loading ? fallbackProducts : (products.length > 0 ? products : fallbackProducts);

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="shop">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
        <div>
          <h2 className="text-3xl md:text-4xl font-serif mb-4">{t('home.trendingNow')}</h2>
          <p className="text-gray-500 text-sm tracking-wide uppercase">{t('home.trendingSubtitle')}</p>
        </div>
        <Link to="/shop" className="hidden md:inline-block border-b border-brand-black pb-1 text-sm uppercase tracking-widest hover:text-gray-500 hover:border-gray-500 transition-colors">
          {t('home.viewAll')}
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {displayProducts.map((product, index) => (
          <motion.div 
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="group cursor-pointer"
          >
            <Link to={`/product/${product.id}`} className="block">
              <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 mb-4">
                <img 
                  src={typeof product.images?.[0] === 'string' ? product.images[0] : product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                  referrerPolicy="no-referrer"
                />
                {product.tags && product.tags[0] && (
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
                        images: Array.isArray(product.images) ? product.images : [product.image || '']
                      });
                    }}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110"
                  >
                    <Heart 
                      className={`w-4 h-4 transition-colors ${isFavorite(product.id) ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} 
                    />
                  </button>
                )}
                
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                  <button 
                    className="w-full bg-white/90 backdrop-blur-sm text-brand-black py-3 text-xs uppercase tracking-widest font-medium hover:bg-brand-black hover:text-white transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                    }}
                  >
                    Quick Add
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium mb-1">{getProductText(product, i18n.language, 'name') || product.name}</h3>
                  <p className="text-sm text-gray-500">{typeof product.price === 'number' ? `€${product.price.toFixed(2)}` : product.price}</p>
                </div>
                <GripVertical className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-12 text-center md:hidden">
        <Link to="/shop" className="inline-block border border-brand-black px-8 py-3 text-sm uppercase tracking-widest hover:bg-brand-black hover:text-white transition-colors">
          {t('shop.viewAllCollection')}
        </Link>
      </div>
    </section>
  );
}
