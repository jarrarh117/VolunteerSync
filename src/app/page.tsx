
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Starfield from '@/components/auth/starfield';
import AuthCard from '@/components/auth/auth-card';
import { ThemeToggle } from '@/components/theme-toggle';
import { Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [shieldClicks, setShieldClicks] = useState(0);

    useEffect(() => {
        if (!loading && user) {
            // User is logged in, redirect them away from the auth page
            router.push('/dashboard');
        }
    }, [user, loading, router]);
    
    // Reset click counter if there's a pause
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (shieldClicks > 0) {
            timer = setTimeout(() => setShieldClicks(0), 1500); // 1.5 second window
        }
        return () => clearTimeout(timer);
    }, [shieldClicks]);


    const handleShieldClick = () => {
        const newClickCount = shieldClicks + 1;
        setShieldClicks(newClickCount);

        if (newClickCount === 3) {
            toast({ title: 'Secret path unlocked.' });
            router.push('/admin/secret-entry?unlock=true');
        }
    };


    // If loading, or user is already logged in, show a loading state 
    // to prevent flicker before redirect
    if (loading || user) {
        return (
            <main className="flex items-center justify-center min-h-screen bg-background overflow-hidden">
                <Starfield />
                 <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
            </main>
        );
    }

    // Only show AuthCard if not loading and no user is logged in
    return (
        <main className="flex items-center justify-center min-h-screen bg-background overflow-hidden p-4">
            <Starfield />
            <button onClick={handleShieldClick} className="absolute top-4 left-4 z-20" aria-label="Admin Access">
              <Shield className="w-6 h-6 text-muted-foreground/30 hover:text-primary/50 transition-colors" />
            </button>
            <div className="absolute top-4 right-4 z-20">
                <ThemeToggle />
            </div>
            <AuthCard />
        </main>
    );
}
