'use client';

import React, { useEffect, useState } from 'react';
import { FirebaseClientProvider } from '@/firebase';
import { CompanyProvider, useCompany } from '@/context/company-context';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';

function AppThemeController({ children }: { children: React.ReactNode }) {
  const { companyData, isLoading } = useCompany();
  // Use a theme from company data, but have a fallback for the initial loading state
  const theme = isLoading ? 'light' : companyData.theme;

  React.useEffect(() => {
    // Ensure document.documentElement is defined (client-side)
    if (typeof window !== 'undefined') {
      document.documentElement.className = theme || 'light';
    }
  }, [theme]);

  return <>{children}</>;
}


export function AppProviders({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // On the server, always default to false. On the client, after mounting, determine based on isMobile.
  const sidebarDefaultOpen = !isMobile && isMounted;

  return (
    <FirebaseClientProvider>
      <CompanyProvider>
          <AppThemeController>
            <SidebarProvider defaultOpen={sidebarDefaultOpen}>
              {children}
            </SidebarProvider>
          </AppThemeController>
      </CompanyProvider>
    </FirebaseClientProvider>
  )
}
