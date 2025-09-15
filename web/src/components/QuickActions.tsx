import React, { useCallback } from 'react';

import type { QuickAction } from '../hooks/useDashboardData';

interface QuickActionsProps {
  actions: QuickAction[];
  reduceMotion?: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({ actions, reduceMotion = false }) => {
  const handleActivate = useCallback(
    (action: QuickAction) => {
      if (!reduceMotion && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(12);
        } catch {
          // Some browsers throw for short vibrations, ignore.
        }
      }
      if (action.onTrigger) {
        action.onTrigger();
      }
    },
    [reduceMotion],
  );

  return (
    <nav className="quick-actions" aria-label="Quick actions">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className="quick-actions__item"
          onClick={() => handleActivate(action)}
        >
          <span className="quick-actions__label">{action.label}</span>
          {action.hint ? <span className="quick-actions__hint">{action.hint}</span> : null}
        </button>
      ))}
    </nav>
  );
};

export default React.memo(QuickActions);
