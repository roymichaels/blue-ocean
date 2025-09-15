import React, { useCallback, useState } from 'react';

interface InstallPromptBannerProps {
  onInstall: () => Promise<boolean> | boolean;
}

const InstallPromptBanner: React.FC<InstallPromptBannerProps> = ({ onInstall }) => {
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  const handleInstall = useCallback(async () => {
    setInstalling(true);
    try {
      const accepted = await onInstall();
      if (accepted) {
        setDismissed(true);
      }
    } finally {
      setInstalling(false);
    }
  }, [onInstall]);

  if (dismissed) {
    return null;
  }

  return (
    <aside className="install-banner" role="region" aria-label="Install Gadget Lab">
      <div>
        <strong>Install Gadget Lab</strong>
        <p>Run the dashboard offline as a standalone workspace.</p>
      </div>
      <div className="install-banner__actions">
        <button type="button" className="install-banner__dismiss" onClick={() => setDismissed(true)}>
          Not now
        </button>
        <button
          type="button"
          className="install-banner__cta"
          onClick={handleInstall}
          disabled={installing}
        >
          {installing ? 'Preparing…' : 'Install'}
        </button>
      </div>
    </aside>
  );
};

export default InstallPromptBanner;
