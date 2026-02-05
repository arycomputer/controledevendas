
'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
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
  setCompanyData: (data: Partial<CompanyData>) => void; // Only updates local state
  saveCompanyData: () => Promise<void>; // Saves local state to Firebase
  isLoading: boolean;
  savedCompanyData: CompanyData;
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
    return firestore && user ? doc(firestore, 'settings', 'companyData') : null;
  }, [firestore, user]);
  
  const { data: remoteCompanyData, isLoading: isSettingsLoading } = useDoc<CompanyData>(settingsDocRef);

  const [companyData, setCompanyDataState] = useState<CompanyData>(defaultCompanyData);
  const [savedCompanyData, setSavedCompanyData] = useState<CompanyData>(defaultCompanyData);
  const [isInitialized, setIsInitialized] = useState(false);

  const isLoading = isUserLoading || (user && isSettingsLoading && !isInitialized);

  useEffect(() => {
    if (isUserLoading || isSettingsLoading) return;

    if (user && remoteCompanyData) {
      const fullData = { ...defaultCompanyData, ...remoteCompanyData };
      setCompanyDataState(fullData);
      setSavedCompanyData(fullData);
      setIsInitialized(true);
    } else if (!user && !isUserLoading) {
      setIsInitialized(true);
    }
  }, [user, isUserLoading, remoteCompanyData, isSettingsLoading]);
  
  const handleSetCompanyData = useCallback((data: Partial<CompanyData>) => {
    setCompanyDataState(prevData => ({ ...prevData, ...data }));
  }, []);

  const handleSaveCompanyData = async () => {
    if (!settingsDocRef) return;
    try {
        await setDoc(settingsDocRef, companyData, { merge: true });
        setSavedCompanyData(companyData); 
    } catch (error) {
        console.error("Failed to save company data:", error);
        throw error; 
    }
  };

  const contextValue = {
    companyData,
    setCompanyData: handleSetCompanyData,
    saveCompanyData: handleSaveCompanyData,
    isLoading,
    savedCompanyData,
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
