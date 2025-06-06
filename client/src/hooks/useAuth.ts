import { useQuery } from "@tanstack/react-query";

// Função centralizada para verificar se o usuário é premium
export const isPremiumUser = (user: any): boolean => {
  if (!user) return false;
  
  const plan = user.plan?.toUpperCase();
  const isPremium = plan === "PREMIUM" || plan === "PREMIUM_CORTESIA";
  const isExpired = user.planExpiresAt && new Date() > new Date(user.planExpiresAt);
  
  return isPremium && !isExpired;
};

export const useAuth = () => {
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new Error('Failed to fetch user');
      }

      return response.json();
    },
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors
      if (error?.message?.includes('401') || error?.status === 401) {
        return false;
      }
      // Only retry 2 times for other errors
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: false, // Disable automatic refetching
    refetchOnWindowFocus: false, // Disable refetch on window focus
  });

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    refetch,
    isPremium: isPremiumUser(user),
  };
};