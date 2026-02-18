
"use client";

import { useState, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginForm from './login-form';
import SignupForm from './signup-form';
import ForgotPasswordForm from './forgot-password-form';


export type AuthType = 'login' | 'signup' | 'forgot';

export default function AuthCard() {
    const [authType, setAuthType] = useState<AuthType>('login');
    const [style, setStyle] = useState<React.CSSProperties>({});

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        const { clientX, clientY, currentTarget } = e;
        const { left, top, width, height } = currentTarget.getBoundingClientRect();
        const x = (clientX - left) / width;
        const y = (clientY - top) / height;
        const rotateX = (y - 0.5) * -20;
        const rotateY = (x - 0.5) * 20;

        setStyle({
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transition: 'transform 0.1s ease-out'
        });
    };

    const handleMouseLeave = () => {
        setStyle({
            transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)',
            transition: 'transform 0.5s ease-in-out'
        });
    };

    return (
        <motion.div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={style}
            className="w-full max-w-md bg-card/60 backdrop-blur-md rounded-2xl border border-border shadow-[0_0_40px_5px_hsl(var(--primary)/0.2)] relative"
        >
            <div style={{ transformStyle: 'preserve-3d' }} className="p-8">
                <AnimatePresence mode="wait">
                    {authType === 'login' && <LoginForm key="login" setAuthType={setAuthType} />}
                    {authType === 'signup' && <SignupForm key="signup" setAuthType={setAuthType} />}
                    {authType === 'forgot' && <ForgotPasswordForm key="forgot" setAuthType={setAuthType} />}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
