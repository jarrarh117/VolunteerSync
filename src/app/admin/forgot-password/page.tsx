
"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AtSign, Send, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import Starfield from '@/components/auth/starfield';
import Link from 'next/link';
import { verifyAdminEmail } from '@/app/actions/send-admin-password-reset';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';


const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

const formVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function AdminForgotPasswordPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      // First, verify on the server if the email belongs to an admin
      const { isAdmin, error } = await verifyAdminEmail(values.email);

      if (error) {
        throw new Error(error);
      }

      if (isAdmin) {
        // If they are an admin, send the reset email from the client
        await sendPasswordResetEmail(auth, values.email);
        setEmailSent(true);
        toast({
          title: "Password Reset Email Sent",
          description: "Please check your inbox for a link to reset your password.",
        });
      } else {
        // For security, show a generic message if not an admin
         toast({
          title: "Request Processed",
          description: "If an admin account with that email exists, a recovery link has been sent.",
        });
        setEmailSent(true); // Pretend it was sent to prevent email enumeration
      }
    } catch (error: any) {
      // Also show a generic message on unexpected errors
      console.error("Password reset error:", error);
      toast({
        title: "Request Processed",
        description: "If an admin account with that email exists, a recovery link has been sent.",
      });
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-background overflow-hidden p-4">
      <Starfield />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, scale: 0.95 },
          visible: { opacity: 1, scale: 1 },
        }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-card/60 backdrop-blur-md rounded-2xl border border-border shadow-[0_0_40px_5px_hsl(var(--primary)/0.2)] p-8 z-10"
      >
        <AnimatePresence mode="wait">
          {emailSent ? (
            <motion.div
              key="success"
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="text-center space-y-4"
            >
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400">Email Sent!</h1>
              <p className="text-muted-foreground">
                If an admin account with email{" "}
                <span className="font-bold text-accent">{form.getValues('email')}</span>{" "}
                exists, a password reset link has been sent. Please check your inbox.
              </p>
              <Button asChild>
                <Link href="/admin/login">
                  <ArrowLeft />
                  Back to Login
                </Link>
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400">Admin Password Reset</h1>
                <p className="text-muted-foreground mt-2">Enter your admin email to receive a recovery link.</p>
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
                  <Button 
                    type="submit" 
                    className="w-full font-bold hover:shadow-[0_0_20px_theme(colors.accent)] transition-shadow" 
                    disabled={loading}
                  >
                    <Send className="mr-2 h-5 w-5" />
                    {loading ? 'Sending...' : 'Send Recovery Link'}
                  </Button>
                </form>
              </Form>
              <div className="text-center text-sm">
                <p>
                    <Link href="/admin/login" className="text-accent font-semibold hover:underline">
                        Back to Admin Login
                    </Link>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
};
