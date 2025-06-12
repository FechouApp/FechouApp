import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import UserOnboarding from "@/components/onboarding/user-onboarding";

export default function Welcome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user) {
      // Check if user has essential personal data filled
      const hasPersonalData = user.firstName && user.lastName && user.businessName && user.phone;
      if (!hasPersonalData) {
        setShowOnboarding(true);
      } else {
        // User already has personal data, mark onboarding as completed and redirect
        localStorage.setItem('fechou_onboarding_completed', 'true');
        setLocation('/');
      }
    }
  }, [user, setLocation]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('fechou_onboarding_completed', 'true');
    window.location.href = '/';
  };

  if (!showOnboarding) {
    return null;
  }

  return <UserOnboarding onComplete={handleOnboardingComplete} />;
}