import React from 'react';

interface DeferredPanelFallbackProps {
  lines?: number;
}

const DeferredPanelFallback: React.FC<DeferredPanelFallbackProps> = ({ lines = 4 }) => (
  <div className="deferred-fallback" aria-hidden="true">
    {Array.from({ length: lines }).map((_, index) => (
      <div key={index.toString()} className="deferred-fallback__line" />
    ))}
  </div>
);

export default DeferredPanelFallback;
