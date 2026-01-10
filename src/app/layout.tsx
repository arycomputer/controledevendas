import './globals.css';
import type { Metadata } from 'next';
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { AppSidebar } from '@/components/app/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { CompanyProvider, useCompany } from '@/context/company-context';
import { FirebaseClientProvider } from '@/firebase';


export const metadata: Metadata = {
  title: 'Controle de Vendas',
  description: 'Gerenciamento de vendas, clientes e produtos.',
};

function AppThemeController({ children }: { children: React.ReactNode }) {
  const { companyData, isLoading } = useCompany();

  const theme = isLoading ? 'light' : companyData.theme;

  React.useEffect(() => {
    document.documentElement.className = theme || 'light';
  }, [theme]);

  return <>{children}</>;
}


function AppProviders({ children }: { children: React.ReactNode }) {
  'use client';
  
  return (
    <FirebaseClientProvider>
      <CompanyProvider>
        <AppThemeController>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <main className="p-4 sm:p-6 lg:p-8">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </AppThemeController>
      </CompanyProvider>
    </FirebaseClientProvider>
  )
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
