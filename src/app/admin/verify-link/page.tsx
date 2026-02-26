
"use client";

import Starfield from '@/components/auth/starfield';
import { motion } from 'framer-motion';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';

export default function VerifyLinkPage() {
  return (
    <div className="w-screen h-screen bg-background flex items-center justify-center overflow-hidden p-4">
      <Starfield />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="z-10 p-8 bg-card/60 backdrop-blur-md rounded-2xl border border-border shadow-[0_0_40px_5px_hsl(var(--primary)/0.2)] text-center max-w-lg"
      >
        <MailCheck className="h-16 w-16 text-primary mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-4">Check Your Inbox</h1>
        <p className="text-muted-foreground">
          A secure sign-in link has been sent to your email address. Click the link to complete your login to the admin panel.
        </p>
         <p className="text-sm text-muted-foreground mt-4">
            This page will automatically redirect once you have verified.
        </p>
        <p className="text-xs text-muted-foreground mt-8">
            <Link href="/" className="hover:underline">Return to Home</Link>
        </p>
      </motion.div>
    </div>
  );
}
