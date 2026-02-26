"use client";

import type { FC } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { AtSign, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { AuthType } from './auth-card';

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

interface ForgotPasswordFormProps {
  setAuthType: (type: AuthType) => void;
}

const formVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const ForgotPasswordForm: FC<ForgotPasswordFormProps> = ({ setAuthType }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your inbox for a link to reset your password.",
      });
      setAuthType('login');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please check the email address.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      variants={formVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400">Reset Password</h1>
        <p className="text-muted-foreground mt-2">We'll send a recovery link to your email.</p>
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
                      placeholder="Email" 
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
          <button onClick={() => setAuthType('login')} className="text-accent font-semibold hover:underline">
            Back to Login
          </button>
        </p>
      </div>
    </motion.div>
  );
};

export default ForgotPasswordForm;
