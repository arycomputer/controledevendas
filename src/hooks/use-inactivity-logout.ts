'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from './use-toast';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function useInactivityLogout() {
  const auth = useAuth();
  const { toast } = useToast();

  const logout = useCallback(() => {
    if (auth && auth.currentUser) {
      signOut(auth).then(() => {
        localStorage.clear();
        sessionStorage.clear();
        toast({
            title: "Sessão Expirada",
            description: "Você foi desconectado por inatividade.",
        });
      });
    }
  }, [auth, toast]);

  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT_MS);
    };

    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [logout]);
}
