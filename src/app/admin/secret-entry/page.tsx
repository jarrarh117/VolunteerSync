
"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import Starfield from '@/components/auth/starfield';
import Link from 'next/link';

const formSchema = z.object({
  password: z.string().min(1, { message: "A password is required." }),
});

function SecretEntryContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('unlock') !== 'true') {
      router.replace('/');
    }
  }, [searchParams, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    // This is a simple client-side check. In a real application, 
    // you would likely want a more secure method.
    if (values.password === "admin26") {
      toast({
        title: "Access Granted",
        description: "Redirecting to Admin Login...",
      });
      // Maintain the unlock state for the next page if needed, or remove it.
      router.push('/admin/login');
    } else {
      toast({
        title: "Access Denied",
        description: "The password provided is incorrect.",
        variant: "destructive",
      });
      form.reset();
      setLoading(false);
    }
  }

  // Don't render the form if we are about to redirect
  if (searchParams.get('unlock') !== 'true') {
    return null; 
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-background overflow-hidden p-4">
      <Starfield />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm bg-card/60 backdrop-blur-md rounded-2xl border border-border shadow-[0_0_40px_5px_hsl(var(--primary)/0.2)] p-8 z-10"
      >
        <div className="space-y-6">
          <div className="text-center">
             <div className="flex justify-center mb-4">
                <ShieldCheck className="w-16 h-16 text-primary" />
             </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400">Admin Verification</h1>
            <p className="text-muted-foreground mt-2">Enter the secret password to proceed.</p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                          type="password" 
                          placeholder="Secret Password" 
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
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
            </form>
          </Form>
           <div className="text-center text-sm">
                <p>
                    <Link href="/" className="text-accent font-semibold hover:underline">
                        Back to Home
                    </Link>
                </p>
              </div>
        </div>
      </motion.div>
    </main>
  );
};

export default function SecretEntryPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SecretEntryContent />
        </Suspense>
    )
}
