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
  theme?: string;
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
  theme: "light",
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const settingsDocRef = useMemoFirebase(() => {
    return firestore ? doc(firestore, 'settings', 'companyData') : null;
  }, [firestore]);
  
  const { data: remoteCompanyData, isLoading: isSettingsLoading } = useDoc<CompanyData>(settingsDocRef);
  const [companyData, setCompanyDataState] = useState<CompanyData>(defaultCompanyData);
  const [isInitialized, setIsInitialized] = useState(false);

  const isLoading = isUserLoading || isSettingsLoading || !isInitialized;

  useEffect(() => {
    // Wait until firebase hooks are done loading and we have a user object
    if (isUserLoading || isSettingsLoading || isInitialized) {
        return;
    }
    
    setIsInitialized(true);

    if (remoteCompanyData) {
      setCompanyDataState(prev => ({...prev, ...remoteCompanyData}));
    } else if (settingsDocRef) {
      setDoc(settingsDocRef, defaultCompanyData)
        .then(() => {
          setCompanyDataState(defaultCompanyData);
        })
        .catch((error) => {
          console.error("Failed to create default company data:", error);
          setCompanyDataState(defaultCompanyData); // Fallback to default on error
        });
    }

  }, [isUserLoading, isSettingsLoading, remoteCompanyData, settingsDocRef, isInitialized]);
  
  const handleSetCompanyData = async (data: Partial<CompanyData>) => {
    if (!settingsDocRef) return;
    const updatedData = { ...companyData, ...data };
    setCompanyDataState(updatedData); // Optimistic update
    try {
        await setDoc(settingsDocRef, updatedData, { merge: true });
    } catch (error) {
        console.error("Failed to save company data:", error);
        // Optional: revert state on error
        // setCompanyDataState(companyData); 
    }
  };

  const contextValue = {
    companyData: companyData,
    setCompanyData: handleSetCompanyData,
    isLoading: isLoading,
  };
  
  if (isLoading) {
     return (
        <div className="flex items-center justify-center h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
