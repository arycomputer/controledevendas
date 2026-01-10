'use client'

import React, { useState } from 'react';
import { useUser, useAuth } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const { toast } = useToast();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) return;
        setIsSubmitting(true);
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // The onAuthStateChanged listener in the Firebase provider will handle the redirect.
        } catch (error: any) {
            let description = "Ocorreu um erro inesperado.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                description = "E-mail ou senha incorretos. Por favor, tente novamente.";
            }
            toast({
                title: "Erro de Login",
                description: description,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isUserLoading || isSubmitting) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center h-full min-h-[50vh] bg-background">
                <Card className="w-full max-w-sm">
                    <CardHeader>
                        <CardTitle>Acesso Restrito</CardTitle>
                        <CardDescription>Por favor, faça login para continuar.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Entrar'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}
