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
    // Only create the doc ref if we have a user and firestore instance
    return firestore && user ? doc(firestore, 'settings', 'companyData') : null;
  }, [firestore, user]);
  
  const { data: remoteCompanyData, isLoading: isSettingsLoading } = useDoc<CompanyData>(settingsDocRef);

  // State for the data currently reflected in the UI (local, might be unsaved)
  const [companyData, setCompanyDataState] = useState<CompanyData>(defaultCompanyData);
  // State for the data as it is saved in Firestore
  const [savedCompanyData, setSavedCompanyData] = useState<CompanyData>(defaultCompanyData);
  
  const [isInitialized, setIsInitialized] = useState(false);

  const isLoading = isUserLoading || (user && isSettingsLoading && !isInitialized);

  useEffect(() => {
    // If we're loading the user or settings, or if we're already initialized, don't do anything.
    if (isUserLoading || isSettingsLoading || isInitialized) {
      // If there's no user and we're not loading, it's initialized with defaults.
      if (!user && !isUserLoading) {
        setIsInitialized(true);
      }
      return;
    }

    // This block runs when user is loaded, but settings might not be yet.
    if (user) {
      if (remoteCompanyData) {
        const fullData = { ...defaultCompanyData, ...remoteCompanyData };
        setCompanyDataState(fullData);
        setSavedCompanyData(fullData);
        setIsInitialized(true);
      } else if (!isSettingsLoading && settingsDocRef) {
        // User is loaded, settings are not, and doc doesn't exist. Create it.
        setDoc(settingsDocRef, defaultCompanyData)
          .then(() => {
            setCompanyDataState(defaultCompanyData);
            setSavedCompanyData(defaultCompanyData);
            setIsInitialized(true);
          })
          .catch((error) => {
            console.error("Failed to create default company data:", error);
            // Proceed with defaults even on error.
            setCompanyDataState(defaultCompanyData);
            setSavedCompanyData(defaultCompanyData);
            setIsInitialized(true);
          });
      }
    }

  }, [user, isUserLoading, remoteCompanyData, isSettingsLoading, settingsDocRef, isInitialized]);
  
  // Only updates the local state for UI previews
  const handleSetCompanyData = useCallback((data: Partial<CompanyData>) => {
    setCompanyDataState(prevData => ({ ...prevData, ...data }));
  }, []);

  // Persists the current local state to Firebase
  const handleSaveCompanyData = async () => {
    if (!settingsDocRef) return;
    try {
        await setDoc(settingsDocRef, companyData, { merge: true });
        setSavedCompanyData(companyData); // Mark current state as saved
    } catch (error) {
        console.error("Failed to save company data:", error);
        // Optionally revert state on error by uncommenting below
        // setCompanyDataState(savedCompanyData); 
        throw error; // re-throw to be caught in the component
    }
  };

  const contextValue = {
    companyData,
    setCompanyData: handleSetCompanyData,
    saveCompanyData: handleSaveCompanyData,
    isLoading,
    savedCompanyData,
  };
  
  // Show a loader while user state is resolving or initial settings are loading
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
