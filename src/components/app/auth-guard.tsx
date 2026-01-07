'use client'

import React, { useState } from 'react';
import { useUser, useAuth, initiateEmailSignIn } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';


export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const { toast } = useToast();

    const [email, setEmail] = useState('admin@admin.com');
    const [password, setPassword] = useState('123456');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) return;
        initiateEmailSignIn(auth, email, password);
    };
    
    if (isUserLoading) {
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
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                Entrar
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}
