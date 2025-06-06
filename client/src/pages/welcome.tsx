import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import UserOnboarding from "@/components/onboarding/user-onboarding";

export default function Welcome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user has personal data in the database
  const { data: personalDataCheck, isLoading } = useQuery({
    queryKey: ['/api/user/has-personal-data'],
    enabled: !!user,
  });

  useEffect(() => {
    if (user && !isLoading && personalDataCheck) {
      // Show onboarding only if user doesn't have personal data
      const hasData = personalDataCheck && typeof personalDataCheck === 'object' && 'hasPersonalData' in personalDataCheck;
      if (hasData && !(personalDataCheck as { hasPersonalData: boolean }).hasPersonalData) {
        setShowOnboarding(true);
      } else if (hasData) {
        setLocation('/');
      }
    }
  }, [user, personalDataCheck, isLoading, setLocation]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('fechou_onboarding_completed', 'true');
    window.location.href = '/';
  };

  if (!showOnboarding) {
    return null;
  }

  return <UserOnboarding onComplete={handleOnboardingComplete} />;
}