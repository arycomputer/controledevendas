'use client'

import React, { useState } from 'react';
import { useUser, useAuth, initiateEmailSignIn } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword } from 'firebase/auth';


export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const { toast } = useToast();

    const [email, setEmail] = useState('admin@admin.com');
    const [password, setPassword] = useState('123456');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) return;
        setIsSubmitting(true);
        try {
            // Non-blocking sign-in attempt
            initiateEmailSignIn(auth, email, password);
        } catch (error: any) {
            // This catch block might not be effective for non-blocking calls,
            // but as a fallback, we check the error code.
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                    toast({
                        title: "Conta de admin criada!",
                        description: "A conta de administrador foi criada. Você será logado automaticamente.",
                    });
                    // initiateEmailSignIn is non-blocking, auth state listener will handle the rest
                } catch (creationError: any) {
                    toast({
                        title: "Erro ao criar conta",
                        description: creationError.message,
                        variant: "destructive",
                    });
                }
            } else {
                 toast({
                    title: "Erro de Login",
                    description: error.message,
                    variant: "destructive",
                });
            }
        } finally {
            // The user state will be updated by the onAuthStateChanged listener,
            // so we don't need to manage submitting state for too long.
            setTimeout(() => setIsSubmitting(false), 2000);
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
