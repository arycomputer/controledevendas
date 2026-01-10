import './globals.css';
import type { Metadata } from 'next';
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from '@/components/app/app-providers';


export const metadata: Metadata = {
  title: 'Controle de Vendas',
  description: 'Gerenciamento de vendas, clientes e produtos.',
};

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
        <Toaster />
      </body>
    </html>
  );
}
