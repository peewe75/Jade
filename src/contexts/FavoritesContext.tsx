import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
}

interface FavoritesContextType {
  favorites: Product[];
  toggleFavorite: (product: Product) => Promise<void>;
  isFavorite: (productId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      return;
    }

    const favoritesRef = doc(db, 'user_favorites', user.uid);
    
    // Listen for real-time updates to favorites
    const unsubscribe = onSnapshot(favoritesRef, (doc) => {
      if (doc.exists()) {
        setFavorites(doc.data().items || []);
      } else {
        setFavorites([]);
        // Create initial doc if it doesn't exist
        setDoc(favoritesRef, { items: [] });
      }
    });

    return () => unsubscribe();
  }, [user]);

  const toggleFavorite = async (product: Product) => {
    if (!user) return;

    const favoritesRef = doc(db, 'user_favorites', user.uid);
    const existingIndex = favorites.findIndex(item => item.id === product.id);
    
    let newFavorites;
    if (existingIndex > -1) {
      // Remove
      newFavorites = favorites.filter(item => item.id !== product.id);
    } else {
      // Add
      newFavorites = [...favorites, product];
    }

    try {
      await setDoc(favoritesRef, { items: newFavorites }, { merge: true });
    } catch (error) {
      console.error("Error updating favorites:", error);
    }
  };

  const isFavorite = (productId: string) => {
    return favorites.some(item => item.id === productId);
  };

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
