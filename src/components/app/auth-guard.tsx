
'use client'

import React, { useState } from 'react';
import { useUser, useAuth } from '@/firebase';
import { Loader2, Menu } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { AppSidebar } from './app-sidebar';
import { SidebarInset, SidebarTrigger } from '../ui/sidebar';
import { useCompany } from '@/context/company-context';
import { useInactivityLogout } from '@/hooks/use-inactivity-logout';
import { NotificationCenter } from './notification-center';


function LoginPage() {
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

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted p-4">
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
    )
}

function TopBar() {
  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 sticky top-0 z-30">
      <div className="flex items-center gap-2 md:hidden">
         <SidebarTrigger>
            <Menu className="h-5 w-5" />
         </SidebarTrigger>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <NotificationCenter />
      </div>
    </header>
  )
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
    useInactivityLogout();

    return (
       <>
            <AppSidebar />
            <SidebarInset>
                <TopBar />
                <main className="p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </SidebarInset>
       </>
    );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const { isLoading: isCompanyLoading } = useCompany();

    const isLoading = isUserLoading || isCompanyLoading;
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return <LoginPage />;
    }

    return (
        <AuthenticatedLayout>
            {children}
        </AuthenticatedLayout>
    );
}
