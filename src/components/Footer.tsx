import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
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
    <footer className="bg-brand-black text-white pt-20 pb-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        
        {/* Brand Info */}
        <div className="lg:col-span-1">
          <h3 className="font-serif text-2xl tracking-widest uppercase mb-6">The Blondes</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Luxury fashion born between the elegance of Lago di Garda and the vibrant energy of Miami.
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-xs uppercase tracking-widest font-medium mb-6">Shop</h4>
          <ul className="space-y-4 text-sm text-gray-400">
            <li><a href="#" className="hover:text-white transition-colors">New Arrivals</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Best Sellers</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Clothing</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Accessories</a></li>
          </ul>
        </div>

        {/* Help */}
        <div>
          <h4 className="text-xs uppercase tracking-widest font-medium mb-6">Customer Care</h4>
          <ul className="space-y-4 text-sm text-gray-400">
            <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Shipping & Returns</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Size Guide</a></li>
            <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h4 className="text-xs uppercase tracking-widest font-medium mb-6">Join The Club</h4>
          {isSubscribed ? (
            <div className="bg-white/10 p-4 border border-gray-700">
              <p className="text-white text-sm font-medium uppercase tracking-widest mb-1">Welcome to the club!</p>
              <p className="text-gray-400 text-xs">You'll receive our next update soon.</p>
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-sm mb-4">
                Subscribe to receive updates, access to exclusive deals, and more.
              </p>
              <form onSubmit={handleSubscribe} className="flex flex-col space-y-2">
                <div className="flex border-b border-gray-700 pb-2">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address" 
                    required
                    className="bg-transparent border-none outline-none text-sm flex-1 text-white placeholder-gray-500"
                  />
                  <button type="submit" className="text-xs uppercase tracking-widest font-medium hover:text-gray-300 transition-colors">
                    Subscribe
                  </button>
                </div>
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
              </form>
            </>
          )}
        </div>

      </div>

      {/* Bottom */}
      <div className="max-w-7xl mx-auto border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} The Blondes Brand. All rights reserved.</p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <a href="#" className="hover:text-white transition-colors">Instagram</a>
          <a href="#" className="hover:text-white transition-colors">TikTok</a>
          <a href="#" className="hover:text-white transition-colors">Pinterest</a>
        </div>
      </div>
    </footer>
  );
}
