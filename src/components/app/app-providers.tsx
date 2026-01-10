'use client';

import React from 'react';
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


export function AppProviders({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <FirebaseClientProvider>
      <CompanyProvider>
        <AppThemeController>
          <SidebarProvider defaultOpen={!isMobile}>
            <AppSidebar />
            <SidebarInset>
              <main className="p-4 sm:p-6 lg:p-8">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
        </AppThemeController>
      </CompanyProvider>
    </FirebaseClientProvider>
  )
}
