import React, { useMemo } from 'react';

import type { MetricSummary } from '../hooks/useDashboardData';

interface MetricCardProps {
  metric: MetricSummary;
  reduceMotion?: boolean;
}

const buildSparklinePath = (points: number[]) => {
  if (!points.length) {
    return {
      stroke: 'M0 12 L100 12',
      area: 'M0 24 L100 24',
    };
  }
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(max - min, 0.0001);
  const step = points.length > 1 ? 100 / (points.length - 1) : 100;

  const strokeSegments: string[] = [];
  const areaSegments: string[] = [];

  points.forEach((point, index) => {
    const x = Number((step * index).toFixed(2));
    const normalized = (point - min) / range;
    const y = Number((22 - normalized * 18).toFixed(2));
    strokeSegments.push(`${index === 0 ? 'M' : 'L'}${x} ${y}`);
    areaSegments.push(`${index === 0 ? 'M' : 'L'}${x} ${y}`);
  });

  const areaPath = `${areaSegments.join(' ')} L100 24 L0 24 Z`;

  return {
    stroke: strokeSegments.join(' '),
    area: areaPath,
  };
};

const formatMetricValue = (metric: MetricSummary) => {
  if (metric.format === 'percentage') {
    return `${metric.value.toFixed(3)}%`;
  }
  if (metric.format === 'duration') {
    return `${Math.round(metric.value)}${metric.unit ? ` ${metric.unit}` : ''}`;
  }
  if (metric.unit) {
    return `${Math.round(metric.value).toLocaleString()} ${metric.unit}`;
  }
  return Math.round(metric.value).toLocaleString();
};

const MetricCard: React.FC<MetricCardProps> = ({ metric, reduceMotion = false }) => {
  const { stroke, area } = useMemo(() => buildSparklinePath(metric.trend), [metric.trend]);

  const delta = metric.delta >= 0 ? `+${metric.delta.toFixed(1)}` : metric.delta.toFixed(1);
  const deltaClass = metric.delta >= 0 ? 'metric-card__delta--up' : 'metric-card__delta--down';

  return (
    <article className="metric-card">
      <header className="metric-card__header">
        <span className="metric-card__label">{metric.label}</span>
        <span className={`metric-card__delta ${deltaClass}`}>
          {delta}%
        </span>
      </header>
      <div className="metric-card__value">{formatMetricValue(metric)}</div>
      <svg className="metric-card__spark" viewBox="0 0 100 24" role="presentation" aria-hidden="true">
        <path className="metric-card__spark-area" d={area} />
        <path
          className="metric-card__spark-line"
          d={stroke}
          style={reduceMotion ? undefined : { strokeDasharray: 120, strokeDashoffset: 0 }}
        />
      </svg>
      <footer className="metric-card__footer">{metric.caption}</footer>
    </article>
  );
};

export default React.memo(MetricCard);
