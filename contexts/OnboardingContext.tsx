import React, { createContext, useContext, useEffect, useState } from 'react';
import { checkOnboarding } from '../utils/config';

interface OnboardingContextType {
  onboarded: boolean | null;
  refreshOnboardingStatus: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType>({
  onboarded: null,
  refreshOnboardingStatus: async () => {},
});

export const useOnboarding = () => useContext(OnboardingContext);

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  const refreshOnboardingStatus = async () => {
    const done = await checkOnboarding();
    setOnboarded(done);
  };

  useEffect(() => {
    refreshOnboardingStatus();
  }, []);

  return (
    <OnboardingContext.Provider value={{ onboarded, refreshOnboardingStatus }}>
      {children}
    </OnboardingContext.Provider>
  );
}
