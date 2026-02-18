
"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { useRouter } from 'next/navigation';
import Starfield from '../auth/starfield';

interface AdminAuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check the user's role from the database
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists() && snapshot.val().role === 'admin') {
          // User is an admin
          setUser(user);
          setIsAdmin(true);
        } else {
          // User is not an admin, sign them out
          await signOut(auth);
          setUser(null);
          setIsAdmin(false);
        }
      } else {
        // No user is signed in
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    router.push('/admin/login');
  };

  // While checking for auth state, show a loading screen.
  if (loading) {
      return (
        <div className="w-screen h-screen bg-background flex items-center justify-center overflow-hidden">
          <Starfield />
          <div className="z-10 text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <h1 className="text-xl text-foreground">Verifying session...</h1>
          </div>
        </div>
      );
  }

  const value = { user, loading, isAdmin, logout };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
