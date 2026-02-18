
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AtSign, Lock, LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import Starfield from '@/components/auth/starfield';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export default function AdminLoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "", password: "" },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        try {
            // Step 1: Authenticate with email and password
            const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;

            // Step 2: Verify the user has the 'admin' role in the database
            const userRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userRef);

            if (snapshot.exists() && snapshot.val().role === 'admin') {
                // Step 3: Role is confirmed, redirect to admin dashboard
                router.push('/admin');
            } else {
                // If not an admin or data doesn't exist, sign out and show error
                await auth.signOut();
                throw new Error("You do not have administrative privileges.");
            }
        } catch (error: any) {
            toast({
                title: "Admin Login Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex items-center justify-center min-h-screen bg-background overflow-hidden p-4">
            <Starfield />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md bg-card/60 backdrop-blur-md rounded-2xl border border-border shadow-[0_0_40px_5px_hsl(var(--primary)/0.2)] p-8 z-10"
            >
                <div className="space-y-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400">Admin Access</h1>
                        <p className="text-muted-foreground mt-2">Enter your administrative credentials.</p>
                    </div>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                <div className="relative">
                                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input 
                                    type="email" 
                                    placeholder="Admin Email" 
                                    {...field} 
                                    className="pl-10 focus:ring-2 focus:ring-accent !ring-offset-0" 
                                    />
                                </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input 
                                    type="password" 
                                    placeholder="Password" 
                                    {...field} 
                                    className="pl-10 focus:ring-2 focus:ring-accent !ring-offset-0"
                                    />
                                </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button 
                            type="submit" 
                            className="w-full font-bold hover:shadow-[0_0_20px_theme(colors.accent)] transition-shadow" 
                            disabled={loading}
                        >
                            <LogIn className="mr-2 h-5 w-5" />
                            {loading ? 'Verifying...' : 'Login'}
                        </Button>
                        </form>
                    </Form>
                    
                    <div className="text-center text-sm space-y-2">
                        <p>
                            <Link href="/admin/forgot-password" className="text-muted-foreground hover:underline">
                                Forgot password?
                            </Link>
                        </p>
                        <p>
                             <Link href="/" className="text-muted-foreground hover:underline">
                                Back to main page
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </main>
    );
};
