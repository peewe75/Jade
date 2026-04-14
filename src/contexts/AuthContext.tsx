import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '../firebase';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureUserRecords = async (loggedInUser: FirebaseUser, source: string, fallbackName?: string) => {
    const userRef = doc(db, 'users', loggedInUser.uid);
    const userSnap = await getDoc(userRef);

    const ADMIN_EMAILS = ['mmalinverno76@gmail.com', 'peewe75@gmail.com', 'mmalinverno@gmail.com', 'avv.sapone@hotmail.it'];
    const isAdminEmail = ADMIN_EMAILS.includes(loggedInUser.email?.toLowerCase() || '');

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: loggedInUser.uid,
        email: loggedInUser.email,
        role: isAdminEmail ? 'admin' : 'customer',
        createdAt: serverTimestamp(),
      });
    } else if (isAdminEmail && userSnap.data().role !== 'admin') {
      await setDoc(userRef, { role: 'admin' }, { merge: true });
    }

    const clientRef = doc(db, 'clients', loggedInUser.uid);
    const clientSnap = await getDoc(clientRef);
    if (!clientSnap.exists()) {
      await setDoc(clientRef, {
        uid: loggedInUser.uid,
        name: fallbackName || loggedInUser.displayName || loggedInUser.email?.split('@')[0] || 'Cliente',
        email: loggedInUser.email,
        photoURL: loggedInUser.photoURL || null,
        source,
        stage: 'new_lead',
        totalOrders: 0,
        totalSpent: 0,
        notesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    // Best-effort: ensure CRM contact exists even for already logged-in sessions.
    ensureUserRecords(user, 'session').catch((error) => {
      console.error('Error ensuring user records:', error);
    });
  }, [user]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await ensureUserRecords(result.user, 'google');
    } catch (error) {
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await ensureUserRecords(result.user, 'site');
    } catch (error) {
      console.error('Error signing in with email', error);
      throw error;
    }
  };

  const signUpWithEmail = async (name: string, email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) {
        await updateProfile(result.user, { displayName: name.trim() });
      }
      await ensureUserRecords(result.user, 'site', name.trim());
    } catch (error) {
      console.error('Error signing up with email', error);
      throw error;
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
