'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc, collection, getDocs, limit, query } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export function FirebaseInitializer({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (isUserLoading) return;
    
    if (!user || !firestore) {
      setIsInitializing(false);
      return;
    }

    const init = async () => {
      try {
        // 1. Initialize User document if missing
        const userRef = doc(firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const usersRef = collection(firestore, 'users');
          const usersQuery = query(usersRef, limit(1));
          const usersSnap = await getDocs(usersQuery);
          const role = usersSnap.empty ? 'admin' : 'seller';

          await setDoc(userRef, {
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Novo Usuário',
            email: user.email || '',
            role: role
          });
        }

        // 2. Initialize Registration Settings if missing
        const regSettingsRef = doc(firestore, 'settings', 'registration');
        const regSnap = await getDoc(regSettingsRef);
        if (!regSnap.exists()) {
          await setDoc(regSettingsRef, {
            customer: { email: true, phone: true, document: true, address: true },
            product: { description: true, quantity: true }
          });
        }

        // 3. Initialize Dashboard Settings if missing
        const dashSettingsRef = doc(firestore, 'settings', 'dashboard');
        const dashSnap = await getDoc(dashSettingsRef);
        if (!dashSnap.exists()) {
          await setDoc(dashSettingsRef, {
            showMonthFilter: true,
            showYearFilter: true
          });
        }

        // 4. Initialize Company Data if missing
        const companyDataRef = doc(firestore, 'settings', 'companyData');
        const companySnap = await getDoc(companyDataRef);
        if (!companySnap.exists()) {
            await setDoc(companyDataRef, {
                name: "Controle de Vendas",
                logo: "https://picsum.photos/seed/logo/80/80",
                document: "00.000.000/0001-00",
                phone: "(11) 99999-8888",
                email: user.email || "contato@minhaempresa.com",
                address: "Rua Exemplo, 123, Cidade - UF",
                theme: "light",
            });
        }

      } catch (error) {
        console.error("Erro ao inicializar banco de dados:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, [user, isUserLoading, firestore]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Sincronizando banco de dados...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
