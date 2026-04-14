import { ShoppingBag, Menu, Search, User } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
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
            <button className="p-2 hover:opacity-70 transition-opacity md:hidden">
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

          {/* Right: Account & Cart */}
          <div className="flex items-center justify-end space-x-4 flex-1">
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
            
            <button className="p-2 hover:opacity-70 transition-opacity relative">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                2
              </span>
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}



