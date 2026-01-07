'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  setCompanyData: (data: CompanyData) => void;
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
  const [companyData, setCompanyData] = useState<CompanyData>(defaultCompanyData);

  return (
    <CompanyContext.Provider value={{ companyData, setCompanyData }}>
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
