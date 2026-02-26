"use client";

import type { FC } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { AtSign, Lock, LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { AuthType } from './auth-card';

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

interface LoginFormProps {
  setAuthType: (type: AuthType) => void;
}

const formVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const LoginForm: FC<LoginFormProps> = ({ setAuthType }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // Let the auth provider handle redirect
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.code === 'auth/invalid-credential' ? 'Invalid email or password.' : error.message,
        variant: "destructive",
      });
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
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400">Welcome Back</h1>
        <p className="text-muted-foreground mt-2">Sign in to continue.</p>
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
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </Form>
      
      <div className="text-center text-sm space-y-2">
        <p>
          Don't have an account?{' '}
          <button onClick={() => setAuthType('signup')} className="text-accent font-semibold hover:underline">
            Sign Up
          </button>
        </p>
        <p>
          <button onClick={() => setAuthType('forgot')} className="text-muted-foreground hover:underline">
            Forgot password?
          </button>
        </p>
      </div>
    </motion.div>
  );
};

export default LoginForm;

    