
'use client';

import React, { useEffect, useState } from 'react';
import { FirebaseClientProvider } from '@/firebase';
import { CompanyProvider, useCompany } from '@/context/company-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app/app-sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

function AppThemeController({ children }: { children: React.ReactNode }) {
  const { companyData, isLoading } = useCompany();
  const theme = isLoading ? 'light' : companyData.theme;

  React.useEffect(() => {
    document.documentElement.className = theme || 'light';
  }, [theme]);

  return <>{children}</>;
}

function ResponsiveSidebarLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Set a consistent default on the server and update on the client.
  const sidebarDefaultOpen = isMounted ? !isMobile : false;

  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <CompanyProvider>
        <AppThemeController>
          <ResponsiveSidebarLayout>
            {children}
          </ResponsiveSidebarLayout>
        </AppThemeController>
      </CompanyProvider>
    </FirebaseClientProvider>
  )
}
