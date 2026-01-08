'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

interface CompanyData {
  name: string;
  logo?: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface CompanyContextType {
  companyData: CompanyData;
  setCompanyData: (data: Partial<CompanyData>) => void;
  isLoading: boolean;
}

const defaultCompanyData: CompanyData = {
  name: "Controle de Vendas",
  logo: "https://picsum.photos/seed/logo/80/80",
  document: "00.000.000/0001-00",
  phone: "(11) 99999-8888",
  email: "contato@minhaempresa.com",
  address: "Rua Exemplo, 123, Cidade - UF",
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const settingsDocRef = useMemoFirebase(() => {
    if (firestore && user) {
        return doc(firestore, 'settings', 'companyData');
    }
    return null;
  }, [firestore, user]);
  
  const { data: remoteCompanyData, isLoading: isSettingsLoading } = useDoc<CompanyData>(settingsDocRef);
  const [companyData, setCompanyDataState] = useState<CompanyData>(defaultCompanyData);
  const [isInitialized, setIsInitialized] = useState(false);

  const isLoading = isUserLoading || (user && !isInitialized);

  useEffect(() => {
    // Prevent running initialization multiple times
    if (isUserLoading || isSettingsLoading || isInitialized || !user) {
        if (!user && !isUserLoading) {
            // If user logs out, reset initialization state
            setCompanyDataState(defaultCompanyData);
            setIsInitialized(false);
        }
        return;
    }

    // Mark as initialized to prevent re-running
    setIsInitialized(true);
    
    if (remoteCompanyData) {
      // If data is found in Firestore, use it
      setCompanyDataState(remoteCompanyData);
    } else if (settingsDocRef) {
      // If no data, it means the document doesn't exist. Create it.
      setDoc(settingsDocRef, defaultCompanyData)
        .then(() => {
          // After creating, set the local state to the default data.
          setCompanyDataState(defaultCompanyData);
        })
        .catch((error) => {
          console.error("Failed to create default company data:", error);
          // Fallback to default data even if Firestore write fails
          setCompanyDataState(defaultCompanyData);
        });
    }

  }, [isUserLoading, isSettingsLoading, remoteCompanyData, user, settingsDocRef, isInitialized]);
  
  const handleSetCompanyData = async (data: Partial<CompanyData>) => {
    if (!settingsDocRef) return;
    const updatedData = { ...companyData, ...data };
    setCompanyDataState(updatedData);
    await setDoc(settingsDocRef, updatedData, { merge: true });
  };

  const contextValue = {
    companyData: companyData,
    setCompanyData: handleSetCompanyData,
    isLoading: isLoading,
  };

  if (isLoading) {
     return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-12 w-12 animate-spin" />
        </div>
    );
  }

  return (
    <CompanyContext.Provider value={contextValue}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
