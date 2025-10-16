"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { clearUserLocalStorage } from "@/lib/localStorage-validator";

/**
 * Global component that listens for database reset events and clears stale localStorage data
 * This ensures that all components get fresh data from the database after a reset
 */
export default function DatabaseResetHandler() {
  const { user } = useAuth();

  useEffect(() => {
    const handleDatabaseReset = () => {
      console.log('[DatabaseResetHandler] Database reset detected, clearing localStorage...');

      if (user?.id) {
        // Clear user-specific localStorage data
        clearUserLocalStorage(user.id);
        console.log(`[DatabaseResetHandler] Cleared localStorage data for user ${user.id}`);
      }

      // Clear general app cache
      if (typeof window !== 'undefined') {
        // Clear quiz-related data
        Object.keys(localStorage).filter(key => key.includes('quiz')).forEach(key => {
          console.log('[DatabaseResetHandler] Removing quiz localStorage key:', key);
          localStorage.removeItem(key);
        });

        // Clear progress-related data
        Object.keys(localStorage).filter(key =>
          key.includes('viewedItems') || key.includes('completedItems')
        ).forEach(key => {
          console.log('[DatabaseResetHandler] Removing progress localStorage key:', key);
          localStorage.removeItem(key);
        });

        // Clear challenge completion data
        Object.keys(localStorage).filter(key => key.startsWith('challenge-completed')).forEach(key => {
          console.log('[DatabaseResetHandler] Removing challenge localStorage key:', key);
          localStorage.removeItem(key);
        });
      }

      console.log('[DatabaseResetHandler] localStorage cleanup completed');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('database-reset', handleDatabaseReset);
      return () => {
        window.removeEventListener('database-reset', handleDatabaseReset);
      };
    }
  }, [user]);

  // This component doesn't render anything
  return null;
}
