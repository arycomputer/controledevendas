'use client';

import React, { useEffect, useState } from 'react';
import { FirebaseClientProvider } from '@/firebase';
import { CompanyProvider, useCompany } from '@/context/company-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app/app-sidebar';
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


function ResponsiveSidebarLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // On the server, always default to false. On the client, after mounting, determine based on isMobile.
  const sidebarDefaultOpen = !isMobile && isMounted;

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

function AppProvidersContent({ children }: { children: React.ReactNode }) {
    const { isLoading } = useCompany();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <AppThemeController>
            <ResponsiveSidebarLayout>
                {children}
            </ResponsiveSidebarLayout>
        </AppThemeController>
    );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <CompanyProvider>
        <AppProvidersContent>
            {children}
        </AppProvidersContent>
      </CompanyProvider>
    </FirebaseClientProvider>
  )
}
