import { useState, type FormEvent } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Instagram, Facebook, Twitter, Pin, Send } from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (email) {
      try {
        setError(null);
        await addDoc(collection(db, 'subscribers'), {
          email: email,
          subscribedAt: serverTimestamp()
        });
        setIsSubscribed(true);
        setEmail('');
      } catch (err) {
        console.error("Error subscribing:", err);
        setError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <footer className="bg-brand-black text-white pt-24 pb-12 px-4 sm:px-6 lg:px-8 border-t border-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
          
          {/* Brand Info */}
          <div className="lg:col-span-1 space-y-8">
            <div>
              <h3 className="font-serif text-3xl tracking-tighter uppercase mb-6">The Blondes</h3>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                Luxury fashion born between the elegance of Lago di Garda and the vibrant energy of Miami.
              </p>
            </div>
            {/* Social Links - Elegant Icons */}
            <div className="flex space-x-5">
              <a 
                href="https://instagram.com/theblondesconcept" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-gray-800 flex items-center justify-center hover:bg-white hover:text-brand-black transition-all duration-300"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-full border border-gray-800 flex items-center justify-center hover:bg-white hover:text-brand-black transition-all duration-300"
                aria-label="TikTok"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                </svg>
              </a>
              <a 
                href="#" 
                className="w-10 h-10 rounded-full border border-gray-800 flex items-center justify-center hover:bg-white hover:text-brand-black transition-all duration-300"
                aria-label="Pinterest"
              >
                <Pin className="w-4 h-4" />
              </a>
              <a 
                href="https://facebook.com/theblondesconcept" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-gray-800 flex items-center justify-center hover:bg-white hover:text-brand-black transition-all duration-300"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500 mb-8">Collections</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><a href="/shop" className="hover:text-white transition-colors">New Arrivals</a></li>
              <li><a href="/shop" className="hover:text-white transition-colors">The Icons</a></li>
              <li><a href="/shop" className="hover:text-white transition-colors">Resort Wear</a></li>
              <li><a href="/shop" className="hover:text-white transition-colors">Accessories</a></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500 mb-8">Customer Care</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Shipping & Returns</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Size Guide</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-1">
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500 mb-8">Newsletter</h4>
            <div className="space-y-6">
              <p className="text-gray-400 text-sm leading-relaxed">
                Join our exclusive circle for early access and seasonal inspirations.
              </p>
              {isSubscribed ? (
                <div className="bg-white/5 p-6 border border-white/10 rounded-sm">
                  <p className="text-white text-sm font-medium uppercase tracking-widest mb-1">Success</p>
                  <p className="text-gray-400 text-xs">You are now part of our community.</p>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="relative">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-mail" 
                    required
                    className="w-full bg-transparent border-b border-gray-800 py-3 pr-10 outline-none text-sm text-white placeholder-gray-600 focus:border-white transition-colors"
                  />
                  <button type="submit" className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:text-gray-300 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                  {error && <p className="text-red-400 text-[10px] mt-2 font-medium">{error}</p>}
                </form>
              )}
            </div>
          </div>

        </div>

        {/* Bottom */}
        <div className="border-t border-gray-900 pt-10 flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-600 uppercase tracking-widest">
          <p>&copy; {new Date().getFullYear()} The Blondes Brand. Handcrafted Excellence.</p>
          <div className="flex space-x-8 mt-6 md:mt-0">
            <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
            <span className="hover:text-white transition-colors cursor-pointer">Cookies</span>
            <span className="hover:text-white transition-colors cursor-pointer">Accessibility</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
