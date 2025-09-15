import { useCallback, useEffect, useState } from 'react';

interface InstallPromptState {
  canInstall: boolean;
  promptInstall: () => Promise<boolean>;
  isStandalone: boolean;
}

export function usePwaInstallPrompt(): InstallPromptState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateStandalone = () => {
      const matchesDisplayMode = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
      const standaloneNavigator = (navigator as Navigator & { standalone?: boolean }).standalone ?? false;
      setIsStandalone(Boolean(matchesDisplayMode || standaloneNavigator));
    };

    const handlePrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt as EventListener);
    window.addEventListener('appinstalled', updateStandalone);
    updateStandalone();

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt as EventListener);
      window.removeEventListener('appinstalled', updateStandalone);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return false;
    }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice.outcome === 'accepted';
  }, [deferredPrompt]);

  return {
    canInstall: deferredPrompt !== null,
    promptInstall,
    isStandalone,
  };
}
