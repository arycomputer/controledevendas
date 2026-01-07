'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
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
  const firestore = useFirestore();
  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'companyData'), [firestore]);
  
  const { data: remoteCompanyData, isLoading } = useDoc<CompanyData>(settingsDocRef);
  const [localCompanyData, setLocalCompanyData] = useState<CompanyData>(defaultCompanyData);

  useEffect(() => {
    if (remoteCompanyData) {
      setLocalCompanyData(remoteCompanyData);
    } else if (!isLoading) {
      // If no data is found and we are not loading, create the initial doc
      setDoc(settingsDocRef, defaultCompanyData);
    }
  }, [remoteCompanyData, isLoading, settingsDocRef]);
  
  const handleSetCompanyData = async (data: Partial<CompanyData>) => {
    const updatedData = { ...localCompanyData, ...data };
    setLocalCompanyData(updatedData);
    await setDoc(settingsDocRef, updatedData, { merge: true });
  };

  const contextValue = {
    companyData: localCompanyData,
    setCompanyData: handleSetCompanyData,
    isLoading,
  };

  if (isLoading && !remoteCompanyData) {
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
