
"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Starfield from '@/components/auth/starfield';

export default function VerifyEmailPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const interval = setInterval(async () => {
            if (user) {
                await user.reload();
                if (user.emailVerified) {
                    router.push('/dashboard');
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [user, router]);


    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/');
            } else if (user.emailVerified) {
                router.push('/dashboard');
            }
        }
    }, [user, loading, router]);

    const handleResendVerification = async () => {
        if (user) {
            setIsSending(true);
            try {
                await sendEmailVerification(user);
                toast({
                    title: "Verification Email Sent",
                    description: "Please check your inbox (and spam folder).",
                });
            } catch (error: any) {
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive",
                });
            } finally {
                setIsSending(false);
            }
        }
    };

    if (loading || !user || (user && user.emailVerified)) {
        return (
          <div className="w-screen h-screen bg-background flex items-center justify-center overflow-hidden">
            <Starfield />
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
          </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-8 overflow-hidden">
            <Starfield />
            <Card className="w-full max-w-md bg-black/40 backdrop-blur-md border border-white/10 shadow-[0_0_40px_5px_hsl(var(--primary)/0.2)]">
                <CardHeader>
                    <CardTitle className="text-2xl text-center bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400">Verify Your Email</CardTitle>
                    <CardDescription className="text-center !mt-2">
                        A verification link has been sent to <strong className="text-accent">{user.email}</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <p className="text-muted-foreground text-sm text-center">
                        Please check your inbox and click the link to activate your account. If you don't see the email, check your spam folder. This page will automatically redirect once you are verified.
                    </p>
                    <Button onClick={handleResendVerification} disabled={isSending} className="font-bold hover:shadow-[0_0_20px_theme(colors.accent)] transition-shadow">
                        {isSending ? "Sending..." : "Resend Verification Email"}
                    </Button>
                    <Button variant="outline" onClick={() => auth.signOut()}>
                        Logout
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
