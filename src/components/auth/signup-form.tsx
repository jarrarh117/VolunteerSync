
"use client";

import type { FC } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AtSign, Lock, UserPlus, Briefcase } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, set } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import type { AuthType } from './auth-card';

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
    .regex(/[0-9]/, { message: "Password must contain at least one number." })
    .regex(/[^a-zA-Z0-9]/, { message: "Password must contain at least one special character." }),
  confirmPassword: z.string(),
  role: z.enum(['volunteer', 'coordinator'], { required_error: "Please select a role." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface SignupFormProps {
  setAuthType: (type: AuthType) => void;
}

const formVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const SignupForm: FC<SignupFormProps> = ({ setAuthType }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const writeUserData = async (uid: string, email: string | null, role: 'volunteer' | 'coordinator' | 'admin') => {
      const userData = {
        uid: uid,
        email: email,
        role: role,
        createdAt: new Date().toISOString(),
      };
      
      const userRef = ref(db, `users/${uid}`);
      await set(userRef, userData);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      await writeUserData(user.uid, user.email, values.role);

      await sendEmailVerification(userCredential.user);
      toast({
        title: "Account Created",
        description: "A verification email has been sent. Please check your inbox.",
      });
      // The auth provider will handle the redirect to /verify-email
    } catch (error: any) {
      toast({
        title: "Sign Up Failed",
        description: error.code === 'auth/email-already-in-use' ? 'This email is already registered.' : error.message,
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
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-400">Create Account</h1>
        <p className="text-muted-foreground mt-2">Join our community of volunteers and coordinators.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                 <FormControl>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="pl-10 focus:ring-2 focus:ring-accent !ring-offset-0">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="volunteer">Volunteer</SelectItem>
                          <SelectItem value="coordinator">Coordinator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                 </FormControl>
                 <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input type="email" placeholder="Email" {...field} className="pl-10 focus:ring-2 focus:ring-accent !ring-offset-0" />
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
                    <Input type="password" placeholder="Password" {...field} className="pl-10 focus:ring-2 focus:ring-accent !ring-offset-0" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input type="password" placeholder="Confirm Password" {...field} className="pl-10 focus:ring-2 focus:ring-accent !ring-offset-0" />
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
            <UserPlus className="mr-2 h-5 w-5" />
            {loading ? 'Creating Account...' : 'Sign Up with Email'}
          </Button>
        </form>
      </Form>
      
      <div className="text-center text-sm">
        <p>
          Already have an account?{' '}
          <button onClick={() => setAuthType('login')} className="text-accent font-semibold hover:underline">
            Login
          </button>
        </p>
      </div>
    </motion.div>
  );
};

export default SignupForm;

    