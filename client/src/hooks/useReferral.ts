import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useReferral() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const processReferralMutation = useMutation({
    mutationFn: (referralCode: string) => 
      apiRequest('POST', '/api/user/referral/process', { referralCode }),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Indicação processada!",
          description: data.message,
        });
        // Clear the stored referral code
        localStorage.removeItem('fechou_referral_code');
      }
    },
    onError: (error: any) => {
      console.error('Error processing referral:', error);
      // Clear the stored referral code even on error to avoid repeated attempts
      localStorage.removeItem('fechou_referral_code');
    }
  });

  useEffect(() => {
    // Check for referral code in URL on page load
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      // Store referral code in localStorage for when user completes registration
      localStorage.setItem('fechou_referral_code', refCode);
      
      // Remove ref parameter from URL for cleaner experience
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('ref');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, []);

  useEffect(() => {
    // Process stored referral code when user becomes authenticated
    if (isAuthenticated && user) {
      const storedReferralCode = localStorage.getItem('fechou_referral_code');
      
      if (storedReferralCode && !user.referredBy) {
        // Process the referral
        processReferralMutation.mutate(storedReferralCode);
      }
    }
  }, [isAuthenticated, user, processReferralMutation]);

  return {
    isProcessingReferral: processReferralMutation.isPending
  };
}