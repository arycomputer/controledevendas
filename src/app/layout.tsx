'use client';

import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppSidebar } from '@/components/app/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { CompanyProvider, useCompany } from '@/context/company-context';
import { FirebaseClientProvider } from '@/firebase';

// export const metadata: Metadata = {
//   title: 'Controle de Vendas',
//   description: 'Gerenciamento de vendas, clientes e produtos.',
// };

function AppLayout({ children }: { children: React.ReactNode }) {
  const { companyData } = useCompany();
  
  return (
    <html lang="pt-BR" suppressHydrationWarning className={companyData.theme}>
      <head>
        <title>Controle de Vendas</title>
        <meta name="description" content="Gerenciamento de vendas, clientes e produtos." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <div className="p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <FirebaseClientProvider>
      <CompanyProvider>
          <AppLayout>{children}</AppLayout>
      </CompanyProvider>
    </FirebaseClientProvider>
  );
}
