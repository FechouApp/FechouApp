import { createContext } from 'react';
import { useFirebaseAuth, AuthContext } from '@/hooks/useFirebaseAuth';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useFirebaseAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}