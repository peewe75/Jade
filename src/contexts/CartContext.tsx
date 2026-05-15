import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import type { CartItem } from '../types/cart';

const LS_KEY = 'jade_cart';

interface CartContextType {
  items: CartItem[];
  count: number;
  subtotal: number; // cents
  loading: boolean;
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (productId: string, variantId: string) => Promise<void>;
  updateQty: (productId: string, variantId: string, qty: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function readLocal(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as CartItem[];
  } catch {
    return [];
  }
}

function writeLocal(items: CartItem[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

function itemKey(item: CartItem) {
  return `${item.productId}:${item.variantId}`;
}

function mergeItems(base: CartItem[], incoming: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const item of base) map.set(itemKey(item), item);
  for (const item of incoming) {
    const key = itemKey(item);
    const existing = map.get(key);
    if (existing) {
      // pezzo unico: take max qty (effectively 1), keep newest snapshot
      map.set(key, { ...item, qty: Math.max(existing.qty, item.qty) });
    } else {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const isMerging = useRef(false);
  const itemsRef = useRef<CartItem[]>([]);

  const commitItems = useCallback((next: CartItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  // Load cart on auth change
  useEffect(() => {
    if (!user) {
      commitItems(readLocal());
      return;
    }

    const run = async () => {
      setLoading(true);
      try {
        const cartRef = doc(db, 'carts', user.uid);
        const snap = await getDoc(cartRef);
        const firestoreItems: CartItem[] = snap.exists() ? (snap.data().items ?? []) : [];
        const localItems = readLocal();

        if (localItems.length > 0 && !isMerging.current) {
          isMerging.current = true;
          const merged = mergeItems(firestoreItems, localItems);
          await setDoc(cartRef, { items: merged, updatedAt: serverTimestamp(), currency: 'EUR' }, { merge: true });
          writeLocal([]);
          commitItems(merged);
        } else {
          commitItems(firestoreItems);
        }
      } catch (err) {
        console.error('Cart load error:', err);
        commitItems(readLocal());
      } finally {
        setLoading(false);
        isMerging.current = false;
      }
    };

    void run();
  }, [user, commitItems]);

  const persistStorage = useCallback(async (next: CartItem[]) => {
    if (user) {
      const cartRef = doc(db, 'carts', user.uid);
      await setDoc(cartRef, { items: next, updatedAt: serverTimestamp(), currency: 'EUR' }, { merge: true });
    } else {
      writeLocal(next);
    }
  }, [user]);

  const applyItems = useCallback(async (next: CartItem[]) => {
    commitItems(next);
    await persistStorage(next);
  }, [commitItems, persistStorage]);

  const addItem = useCallback(async (item: CartItem) => {
    const existing = itemsRef.current.find(i => itemKey(i) === itemKey(item));
    const next = existing
      ? itemsRef.current.map(i => itemKey(i) === itemKey(item) ? { ...i, qty: Math.min(i.qty + item.qty, 99) } : i)
      : [...itemsRef.current, item];

    await applyItems(next);
  }, [applyItems]);

  const removeItem = useCallback(async (productId: string, variantId: string) => {
    const next = itemsRef.current.filter(i => !(i.productId === productId && i.variantId === variantId));
    await applyItems(next);
  }, [applyItems]);

  const updateQty = useCallback(async (productId: string, variantId: string, qty: number) => {
    if (qty < 1) { await removeItem(productId, variantId); return; }
    const next = itemsRef.current.map(i => i.productId === productId && i.variantId === variantId ? { ...i, qty: Math.min(qty, 99) } : i);
    await applyItems(next);
  }, [applyItems, removeItem]);

  const clearCart = useCallback(async () => {
    await applyItems([]);
  }, [applyItems]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.priceSnapshot * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, count, subtotal, loading, addItem, removeItem, updateQty, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
