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
      // Check if user has completed onboarding
      const hasCompletedOnboarding = localStorage.getItem('fechou_onboarding_completed');
      if (!hasCompletedOnboarding) {
        setShowOnboarding(true);
      } else {
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