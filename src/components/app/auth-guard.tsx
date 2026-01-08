'use client'

import React, { useState, useEffect } from 'react';
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

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Track login attempts to trigger account creation
    const [loginAttempted, setLoginAttempted] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) return;
        setIsSubmitting(true);
        setLoginAttempted(true); // Mark that a login has been attempted
        
        try {
            // Non-blocking sign-in attempt
            initiateEmailSignIn(auth, email, password);
        } catch (error: any) {
            // This block will likely not catch auth errors from the non-blocking call
            toast({
                title: "Erro de Login",
                description: "Ocorreu um erro inesperado.",
                variant: "destructive",
            });
            setIsSubmitting(false);
            setLoginAttempted(false);
        }
    };
    
    // Effect to handle automatic account creation after a failed login attempt
    useEffect(() => {
        // Only run if a login was attempted, we are not loading, there's no user, and we have an auth instance.
        if (loginAttempted && !isUserLoading && !user && auth) {
            
            // Wait a moment to ensure the auth state listener has had time to process the initial sign-in attempt.
            const timeoutId = setTimeout(async () => {
                // If after the timeout there's still no user, we assume the credentials were invalid
                // because the user does not exist, and we proceed to create the account.
                if (!auth.currentUser && email === 'admin@admin.com') {
                    try {
                        await createUserWithEmailAndPassword(auth, email, password);
                        toast({
                            title: "Conta de admin criada!",
                            description: "A conta de administrador foi criada. Você será logado automaticamente.",
                        });
                        // The onAuthStateChanged listener will handle the successful login state change.
                    } catch (creationError: any) {
                        // Handle cases where even creation fails (e.g., weak password, email already exists with different credential)
                        toast({
                            title: "Erro ao criar conta",
                            description: creationError.message || "Não foi possível criar a conta de administrador.",
                            variant: "destructive",
                        });
                    } finally {
                        setIsSubmitting(false);
                        setLoginAttempted(false); // Reset attempt state
                    }
                } else {
                    // User was logged in successfully, just reset state
                    setIsSubmitting(false);
                    setLoginAttempted(false);
                }

            }, 1500); // 1.5 second delay

            return () => clearTimeout(timeoutId);
        }
        
        // If user logs in successfully, reset submission state
        if (user) {
            setIsSubmitting(false);
            setLoginAttempted(false);
        }

    }, [loginAttempted, isUserLoading, user, auth, email, password, toast]);
    
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
