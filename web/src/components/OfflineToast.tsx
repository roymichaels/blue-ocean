import React, { useEffect, useState } from 'react';

interface OfflineToastProps {
  offline: boolean;
}

const OfflineToast: React.FC<OfflineToastProps> = ({ offline }) => {
  const [visible, setVisible] = useState(offline);

  useEffect(() => {
    if (offline) {
      setVisible(true);
      return () => undefined;
    }
    const timeout = window.setTimeout(() => setVisible(false), 1200);
    return () => window.clearTimeout(timeout);
  }, [offline]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={`offline-toast ${offline ? 'offline-toast--down' : 'offline-toast--restored'}`}
      role="status"
      aria-live="polite"
    >
      <span className="offline-toast__dot" aria-hidden="true" />
      <span>{offline ? 'You are offline. Working from local cache.' : 'Connection restored. Syncing updates…'}</span>
    </div>
  );
};

export default OfflineToast;
