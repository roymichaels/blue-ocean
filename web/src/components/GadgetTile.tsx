import React, { useCallback, useMemo, useState } from 'react';

import type { GadgetSummary } from '../hooks/useDashboardData';

interface GadgetTileProps {
  gadget: GadgetSummary;
  reduceMotion?: boolean;
}

const GadgetTile: React.FC<GadgetTileProps> = ({ gadget, reduceMotion = false }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduceMotion) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
      const relativeY = (event.clientY - rect.top) / rect.height - 0.5;
      setTilt({
        x: Number((relativeX * 12).toFixed(2)),
        y: Number((-relativeY * 12).toFixed(2)),
      });
    },
    [reduceMotion],
  );

  const resetTilt = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  const style = useMemo(() => {
    const baseShadow = `0 12px 24px -12px ${gadget.accent}80`;
    const accentBackground = `linear-gradient(150deg, ${gadget.accent}33, rgba(15, 23, 42, 0.82))`;
    if (reduceMotion) {
      return {
        boxShadow: baseShadow,
        background: accentBackground,
        borderColor: `${gadget.accent}55`,
      };
    }
    return {
      transform: `perspective(960px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
      transition: 'transform 180ms ease, box-shadow 200ms ease',
      boxShadow: `${baseShadow}, 0 1px 0 0 #0ea5e955 inset`,
      background: accentBackground,
      borderColor: `${gadget.accent}55`,
    };
  }, [gadget.accent, reduceMotion, tilt.x, tilt.y]);

  return (
    <article
      className="gadget-tile"
      style={style}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onPointerUp={resetTilt}
      onFocus={resetTilt}
      tabIndex={0}
      aria-label={`${gadget.name} status ${gadget.status}`}
    >
      <div className="gadget-tile__shine" aria-hidden="true" />
      <div className="gadget-tile__header">
        <span className={`gadget-tile__status gadget-tile__status--${gadget.status}`}>
          {gadget.statusLabel}
        </span>
        <span className="gadget-tile__tag">{gadget.signal}</span>
      </div>
      <h2 className="gadget-tile__title">{gadget.name}</h2>
      <p className="gadget-tile__body">{gadget.description}</p>
      <footer className="gadget-tile__footer">
        <span>{gadget.throughput}</span>
        <span className="gadget-tile__footer-accent">{gadget.health}</span>
      </footer>
    </article>
  );
};

export default React.memo(GadgetTile);
