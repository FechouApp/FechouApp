import { useState, useEffect, createContext, useContext } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { apiRequest } from '@/lib/queryClient';

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  plan: string;
  planExpiresAt?: Date;
  isAdmin?: boolean;
  emailVerified: boolean;
  [key: string]: any;
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  updateUserProfile: (data: Partial<AuthUser>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useFirebaseAuth(): AuthContextType {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user data from our backend
          const token = await firebaseUser.getIdToken();
          const userData = await apiRequest(`/api/auth/user`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          setUser({
            ...userData,
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            emailVerified: firebaseUser.emailVerified
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
          // If user doesn't exist in our DB, create them
          if (firebaseUser.email) {
            try {
              const token = await firebaseUser.getIdToken();
              const newUser = await apiRequest('/api/auth/register', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  email: firebaseUser.email,
                  firstName: firebaseUser.displayName?.split(' ')[0] || '',
                  lastName: firebaseUser.displayName?.split(' ')[1] || ''
                })
              });

              setUser({
                ...newUser,
                id: firebaseUser.uid,
                email: firebaseUser.email,
                emailVerified: firebaseUser.emailVerified
              });
            } catch (createError) {
              console.error('Error creating user:', createError);
              setUser(null);
            }
          }
        }
        setFirebaseUser(firebaseUser);
      } else {
        setUser(null);
        setFirebaseUser(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      await updateProfile(userCredential.user, {
        displayName: `${firstName} ${lastName}`
      });

      // Send verification email
      await sendEmailVerification(userCredential.user);

    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear user state immediately
      setUser(null);
      setFirebaseUser(null);
      // Redirect to login page
      window.location.href = '/login';
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const sendVerificationEmail = async () => {
    if (firebaseUser) {
      try {
        await sendEmailVerification(firebaseUser);
      } catch (error: any) {
        throw new Error(error.message);
      }
    }
  };

  const updateUserProfile = async (data: Partial<AuthUser>) => {
    if (firebaseUser) {
      try {
        const token = await firebaseUser.getIdToken();
        const updatedUser = await apiRequest('/api/auth/user', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });

        setUser({ ...user, ...updatedUser });
      } catch (error: any) {
        throw new Error(error.message);
      }
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!firebaseUser || !firebaseUser.email) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Validar nova senha
      if (newPassword.length < 6) {
        throw new Error('A nova senha deve ter pelo menos 6 caracteres');
      }

      // Reautenticar o usuário com a senha atual
      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        currentPassword
      );
      
      await reauthenticateWithCredential(firebaseUser, credential);

      // Atualizar a senha
      await updatePassword(firebaseUser, newPassword);
      
    } catch (error: any) {
      // Tratar erros específicos do Firebase
      let errorMessage = 'Erro ao alterar senha';
      
      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage = 'Senha atual incorreta';
          break;
        case 'auth/weak-password':
          errorMessage = 'A nova senha é muito fraca';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'Por segurança, faça login novamente antes de alterar a senha';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
          break;
        default:
          errorMessage = error.message || errorMessage;
      }
      
      throw new Error(errorMessage);
    }
  };

  return {
    user,
    firebaseUser,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    resetPassword,
    sendVerificationEmail,
    updateUserProfile,
    changePassword
  };
}

export { AuthContext };