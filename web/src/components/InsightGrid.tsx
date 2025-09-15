import React from 'react';

import type { InsightSummary } from '../hooks/useDashboardData';

interface InsightGridProps {
  insights: InsightSummary[];
  reduceMotion?: boolean;
}

const InsightGrid: React.FC<InsightGridProps> = ({ insights, reduceMotion = false }) => (
  <section className="insight-grid" aria-label="Operational insights">
    {insights.map((insight) => {
      const width = `${Math.round(insight.confidence * 100)}%`;
      return (
        <article key={insight.id} className="insight-grid__item">
          <header className="insight-grid__header">
            <span className={`insight-grid__badge insight-grid__badge--${insight.intent}`}>
              {insight.intentLabel}
            </span>
            <time dateTime={insight.timestampISO} className="insight-grid__timestamp">
              {insight.timestamp}
            </time>
          </header>
          <h3 className="insight-grid__title">{insight.title}</h3>
          <p className="insight-grid__summary">{insight.summary}</p>
          <div className="insight-grid__confidence" aria-label={`Confidence ${width}`}>
            <div className="insight-grid__confidence-track">
              <div
                className="insight-grid__confidence-fill"
                style={
                  reduceMotion
                    ? { width }
                    : { width, transition: 'width 320ms ease-in-out' }
                }
              />
            </div>
            <span className="insight-grid__confidence-label">{width}</span>
          </div>
        </article>
      );
    })}
  </section>
);

export default InsightGrid;
