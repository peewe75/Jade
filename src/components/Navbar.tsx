import { ShoppingBag, Menu, X, Search, User, Heart } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  
  // Force solid background if not on home page
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const navClass = isHome 
    ? `fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'glass shadow-lg py-1' : 'bg-transparent text-white py-4'}`
    : `fixed top-0 left-0 right-0 z-50 transition-all duration-500 glass shadow-md py-1`;

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={navClass}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Left: Menu & Search */}
          <div className="flex items-center space-x-6 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:opacity-70 transition-opacity md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex space-x-6 text-sm uppercase tracking-widest font-medium">
              <Link to="/shop" className="hover:opacity-70 transition-opacity">Shop</Link>
              <Link to="/about" className="hover:opacity-70 transition-opacity">The Brand</Link>
            </div>
            <button className="p-2 hover:opacity-70 transition-opacity hidden sm:block">
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* Center: Logo */}
          <div className="flex-1 text-center">
            <Link to="/" className="font-serif text-2xl tracking-widest uppercase font-semibold">
              The Blondes Concept
            </Link>
          </div>

          {/* Right: Account & Search */}
          <div className="flex items-center justify-end space-x-4 flex-1">
            <button 
              onClick={() => setIsFavoritesOpen(true)}
              className="p-2 hover:opacity-70 transition-opacity relative"
            >
              <Heart className={`w-5 h-5 ${favorites.length > 0 ? 'text-red-500 fill-red-500' : ''}`} />
              {favorites.length > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </button>
            {user ? (
              <div ref={accountMenuRef} className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((current) => !current)}
                  className="p-2 hover:opacity-70 transition-opacity flex items-center"
                  aria-haspopup="menu"
                  aria-expanded={isAccountMenuOpen}
                  aria-label="Apri menu account"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                </button>
                <div className={`absolute right-0 mt-2 w-48 bg-white border border-gray-100 shadow-lg transition-all duration-200 ${isAccountMenuOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 pointer-events-none'}`}>
                  <div className="p-4 border-b border-gray-100">
                    <p className="text-sm font-medium text-brand-black truncate">{user.displayName || 'User'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <Link 
                    to="/admin"
                    onClick={() => setIsAccountMenuOpen(false)}
                    className="block w-full text-left px-4 py-3 text-sm uppercase tracking-widest font-medium hover:bg-gray-50 text-brand-black transition-colors border-b border-gray-100"
                  >
                    Dashboard
                  </Link>
                  <button 
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      void logout();
                    }}
                    className="w-full text-left px-4 py-3 text-sm uppercase tracking-widest font-medium hover:bg-gray-50 text-brand-black transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="p-2 hover:opacity-70 transition-opacity hidden sm:block">
                <User className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[80%] max-w-sm bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 flex justify-between items-center border-b border-gray-100">
                <span className="font-serif text-xl tracking-widest uppercase font-semibold">Menu</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 -mr-2">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-grow overflow-y-auto py-8 px-6 space-y-8">
                <div className="space-y-6">
                  <Link 
                    to="/shop" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-2xl font-serif tracking-wide hover:pl-2 transition-all"
                  >
                    Shop
                  </Link>
                  <Link 
                    to="/about" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block text-2xl font-serif tracking-wide hover:pl-2 transition-all"
                  >
                    The Brand
                  </Link>
                  <button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsFavoritesOpen(true);
                    }}
                    className="flex items-center space-x-3 text-2xl font-serif tracking-wide hover:pl-2 transition-all"
                  >
                    <span>My Favorites</span>
                    {favorites.length > 0 && <span className="text-sm font-sans bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center">{favorites.length}</span>}
                  </button>
                </div>

                <div className="pt-8 border-t border-gray-100 space-y-4">
                  {!user && (
                    <Link 
                      to="/login" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center space-x-3 text-lg"
                    >
                      <User className="w-5 h-5" />
                      <span>Sign In</span>
                    </Link>
                  )}
                  <button className="flex items-center space-x-3 text-lg">
                    <Search className="w-5 h-5" />
                    <span>Search</span>
                  </button>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-widest text-center">
                  © {new Date().getFullYear()} The Blondes Concept
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Favorites Drawer Overlay */}
      <AnimatePresence>
        {isFavoritesOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFavoritesOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[90%] max-w-md bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  <span className="font-serif text-xl tracking-widest uppercase font-semibold">Favorites</span>
                </div>
                <button onClick={() => setIsFavoritesOpen(false)} className="p-2 -mr-2">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-grow overflow-y-auto p-6">
                {favorites.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <Heart className="w-12 h-12 text-gray-100" />
                    <div>
                      <h3 className="text-lg font-medium">Your wishlist is empty</h3>
                      <p className="text-sm text-gray-500 mt-2">Save your favorite items to keep track of what you love.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsFavoritesOpen(false);
                        location.pathname !== '/shop' && window.scrollTo(0, 0);
                      }}
                      className="mt-4 px-8 py-3 bg-brand-black text-white text-xs uppercase tracking-widest font-medium hover:opacity-80 transition-opacity"
                    >
                      Explore Collection
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {favorites.map((product) => (
                      <div key={product.id} className="flex space-x-4 group">
                        <Link 
                          to={`/product/${product.id}`}
                          onClick={() => setIsFavoritesOpen(false)}
                          className="w-24 h-32 shrink-0 bg-gray-100 overflow-hidden"
                        >
                          <img 
                            src={product.images[0]} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                        </Link>
                        <div className="flex-grow flex flex-col justify-between py-1">
                          <div>
                            <Link 
                              to={`/product/${product.id}`}
                              onClick={() => setIsFavoritesOpen(false)}
                              className="block text-sm font-medium hover:text-gray-600 transition-colors"
                            >
                              {product.name}
                            </Link>
                            <p className="text-sm text-gray-500 mt-1">€{product.price.toFixed(2)}</p>
                          </div>
                          <button 
                            onClick={() => toggleFavorite(product)}
                            className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors w-fit"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {favorites.length > 0 && (
                <div className="p-6 border-t border-gray-100">
                  <Link 
                    to="/shop" 
                    onClick={() => setIsFavoritesOpen(false)}
                    className="block w-full text-center py-4 bg-brand-black text-white text-xs uppercase tracking-widest font-medium hover:opacity-90 transition-opacity"
                  >
                    Continue Shopping
                  </Link>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}



