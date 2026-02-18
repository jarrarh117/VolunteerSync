
"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import Starfield from '@/components/auth/starfield';

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) {
            return; // Wait until loading is false
        }

        if (!user) {
            router.push('/');
            return;
        }

        if (!user.emailVerified) {
            router.push('/verify-email');
            return;
        }

        const getRole = async () => {
            try {
                const userRef = ref(db, `users/${user.uid}`);
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    const userRole = userData.role;

                    if (userRole === 'admin') {
                        router.push('/admin');
                    } else if (userRole === 'coordinator') {
                        router.push('/dashboard/coordinator');
                    } else if (userRole === 'volunteer') {
                        router.push('/dashboard/volunteer');
                    } else {
                        // Handle cases with no role or other roles, maybe redirect to a profile setup page
                        console.error("User has no valid role.");
                        router.push('/');
                    }
                } else {
                    // User doc doesn't exist
                    console.error("User data not found in Realtime Database.");
                    router.push('/');
                }
            } catch (error) {
                console.error("Error fetching user role:", error);
                router.push('/'); // Redirect on error
            }
        };

        getRole();

    }, [user, loading, router]);
    
    // This is a loading/transition page
    return (
      <div className="w-screen h-screen bg-background flex items-center justify-center overflow-hidden">
        <Starfield />
        <div className="text-center z-10">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <h1 className="text-2xl text-foreground">Loading your dashboard...</h1>
        </div>
      </div>
    );
}

    