import { sha256 } from '@noble/hashes/sha256';

export type MetricLabelValue = string | number | boolean | null | undefined;
export type MetricLabels = Record<string, MetricLabelValue>;

export interface MetricOptions {
  name: string;
  help: string;
  labelNames?: string[];
  anonymizeLabels?: boolean;
}

interface MetricDescriptor {
  name: string;
  help: string;
  labelNames: string[];
  anonymizeLabels: boolean;
}

interface CounterEntry {
  labels: Record<string, string>;
  value: number;
}

interface GaugeEntry {
  labels: Record<string, string>;
  value: number;
}

export interface HistogramEntry {
  labels: Record<string, string>;
  count: number;
  sum: number;
  min: number;
  max: number;
  last: number;
  avg: number;
}

export interface RegistrySnapshot {
  counters: Record<string, CounterEntry[]>;
  histograms: Record<string, HistogramEntry[]>;
  gauges: Record<string, GaugeEntry[]>;
  timestamp: string;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeLabelValue(value: MetricLabelValue): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function hashLabel(value: string): string {
  return toHex(sha256(value));
}

class LocalMetricRegistryImpl {
  readonly counters = new Map<string, LocalCounter>();
  readonly histograms = new Map<string, LocalHistogram>();
  readonly gauges = new Map<string, LocalGauge>();
  private readonly anonymizeLabels: boolean;

  constructor(anonymizeLabels = true) {
    this.anonymizeLabels = anonymizeLabels;
  }

  registerCounter(options: MetricOptions): LocalCounter {
    const descriptor = this.normalizeOptions(options);
    const existing = this.counters.get(descriptor.name);
    if (existing) return existing;
    if (this.histograms.has(descriptor.name) || this.gauges.has(descriptor.name)) {
      throw new Error(`metric name "${descriptor.name}" already registered with a different type`);
    }
    const counter = new LocalCounter(this, descriptor);
    this.counters.set(descriptor.name, counter);
    return counter;
  }

  registerHistogram(options: MetricOptions): LocalHistogram {
    const descriptor = this.normalizeOptions(options);
    const existing = this.histograms.get(descriptor.name);
    if (existing) return existing;
    if (this.counters.has(descriptor.name) || this.gauges.has(descriptor.name)) {
      throw new Error(`metric name "${descriptor.name}" already registered with a different type`);
    }
    const histogram = new LocalHistogram(this, descriptor);
    this.histograms.set(descriptor.name, histogram);
    return histogram;
  }

  registerGauge(options: MetricOptions): LocalGauge {
    const descriptor = this.normalizeOptions(options);
    const existing = this.gauges.get(descriptor.name);
    if (existing) return existing;
    if (this.counters.has(descriptor.name) || this.histograms.has(descriptor.name)) {
      throw new Error(`metric name "${descriptor.name}" already registered with a different type`);
    }
    const gauge = new LocalGauge(this, descriptor);
    this.gauges.set(descriptor.name, gauge);
    return gauge;
  }

  private normalizeOptions(options: MetricOptions): MetricDescriptor {
    const labelNames = options.labelNames ? Array.from(new Set(options.labelNames)) : [];
    return {
      name: options.name,
      help: options.help,
      labelNames,
      anonymizeLabels: options.anonymizeLabels ?? this.anonymizeLabels,
    };
  }

  prepareLabels(descriptor: MetricDescriptor, labels: MetricLabels = {}): Record<string, string> {
    if (!descriptor.labelNames.length) {
      return {};
    }
    const prepared: Record<string, string> = {};
    for (const label of descriptor.labelNames) {
      if (!(label in labels)) continue;
      const value = normalizeLabelValue(labels[label]);
      prepared[label] = descriptor.anonymizeLabels ? hashLabel(`${label}:${value}`) : value;
    }
    return prepared;
  }

  labelKey(descriptor: MetricDescriptor, labels: Record<string, string>): string {
    if (!descriptor.labelNames.length) return '__default__';
    return descriptor.labelNames
      .map((name) => `${name}:${labels[name] ?? ''}`)
      .join('|');
  }
}

export class LocalCounter {
  private readonly values = new Map<string, CounterEntry>();

  constructor(
    private readonly registry: LocalMetricRegistryImpl,
    private readonly descriptor: MetricDescriptor,
  ) {}

  inc(labels: MetricLabels = {}, value = 1): number {
    const prepared = this.registry.prepareLabels(this.descriptor, labels);
    const key = this.registry.labelKey(this.descriptor, prepared);
    const current = this.values.get(key) ?? { labels: prepared, value: 0 };
    current.value += value;
    this.values.set(key, current);
    return current.value;
  }

  getValue(labels: MetricLabels = {}): number {
    const prepared = this.registry.prepareLabels(this.descriptor, labels);
    const key = this.registry.labelKey(this.descriptor, prepared);
    return this.values.get(key)?.value ?? 0;
  }

  reset(labels?: MetricLabels): void {
    if (!labels || !this.descriptor.labelNames.length) {
      this.values.clear();
      return;
    }
    const prepared = this.registry.prepareLabels(this.descriptor, labels);
    const key = this.registry.labelKey(this.descriptor, prepared);
    this.values.delete(key);
  }

  snapshot(): CounterEntry[] {
    return Array.from(this.values.values()).map((entry) => ({
      labels: { ...entry.labels },
      value: entry.value,
    }));
  }
}

export class LocalGauge {
  private readonly values = new Map<string, GaugeEntry>();

  constructor(
    private readonly registry: LocalMetricRegistryImpl,
    private readonly descriptor: MetricDescriptor,
  ) {}

  set(value: number): void;
  set(labels: MetricLabels, value: number): void;
  set(arg1: MetricLabels | number, arg2?: number): void {
    const [labels, value] =
      typeof arg1 === 'number'
        ? [{}, arg1]
        : [arg1, arg2 ?? 0];
    const prepared = this.registry.prepareLabels(this.descriptor, labels);
    const key = this.registry.labelKey(this.descriptor, prepared);
    this.values.set(key, { labels: prepared, value });
  }

  getValue(labels: MetricLabels = {}): number {
    const prepared = this.registry.prepareLabels(this.descriptor, labels);
    const key = this.registry.labelKey(this.descriptor, prepared);
    return this.values.get(key)?.value ?? 0;
  }

  reset(labels?: MetricLabels): void {
    if (!labels || !this.descriptor.labelNames.length) {
      this.values.clear();
      return;
    }
    const prepared = this.registry.prepareLabels(this.descriptor, labels);
    const key = this.registry.labelKey(this.descriptor, prepared);
    this.values.delete(key);
  }

  snapshot(): GaugeEntry[] {
    return Array.from(this.values.values()).map((entry) => ({
      labels: { ...entry.labels },
      value: entry.value,
    }));
  }
}

export class LocalHistogram {
  private readonly values = new Map<string, HistogramEntry>();

  constructor(
    private readonly registry: LocalMetricRegistryImpl,
    private readonly descriptor: MetricDescriptor,
  ) {}

  observe(labels: MetricLabels = {}, value: number): number {
    const prepared = this.registry.prepareLabels(this.descriptor, labels);
    const key = this.registry.labelKey(this.descriptor, prepared);
    const current = this.values.get(key) ?? {
      labels: prepared,
      count: 0,
      sum: 0,
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY,
      last: 0,
      avg: 0,
    };
    current.count += 1;
    current.sum += value;
    current.min = Math.min(current.min, value);
    current.max = Math.max(current.max, value);
    current.last = value;
    current.avg = current.count ? current.sum / current.count : 0;
    current.labels = prepared;
    this.values.set(key, current);
    return value;
  }

  startTimer(labels: MetricLabels = {}): (extraLabels?: MetricLabels) => number {
    const started = Date.now();
    return (override: MetricLabels = {}) => {
      const combined = { ...labels, ...override };
      const duration = Date.now() - started;
      this.observe(combined, duration);
      return duration;
    };
  }

  getStats(labels: MetricLabels = {}): HistogramEntry | undefined {
    const prepared = this.registry.prepareLabels(this.descriptor, labels);
    const key = this.registry.labelKey(this.descriptor, prepared);
    const entry = this.values.get(key);
    if (!entry) return undefined;
    return { ...entry, labels: { ...entry.labels } };
  }

  reset(labels?: MetricLabels): void {
    if (!labels || !this.descriptor.labelNames.length) {
      this.values.clear();
      return;
    }
    const prepared = this.registry.prepareLabels(this.descriptor, labels);
    const key = this.registry.labelKey(this.descriptor, prepared);
    this.values.delete(key);
  }

  snapshot(): HistogramEntry[] {
    return Array.from(this.values.values()).map((entry) => ({
      labels: { ...entry.labels },
      count: entry.count,
      sum: entry.sum,
      min: entry.min === Number.POSITIVE_INFINITY ? 0 : entry.min,
      max: entry.max === Number.NEGATIVE_INFINITY ? 0 : entry.max,
      last: entry.last,
      avg: entry.avg,
    }));
  }
}

export class LocalMetricRegistry {
  private readonly impl: LocalMetricRegistryImpl;

  constructor(options: { anonymizeLabels?: boolean } = {}) {
    this.impl = new LocalMetricRegistryImpl(options.anonymizeLabels);
  }

  createCounter(options: MetricOptions): LocalCounter {
    return this.impl.registerCounter(options);
  }

  createHistogram(options: MetricOptions): LocalHistogram {
    return this.impl.registerHistogram(options);
  }

  createGauge(options: MetricOptions): LocalGauge {
    return this.impl.registerGauge(options);
  }

  snapshot(): RegistrySnapshot {
    const counters: Record<string, CounterEntry[]> = {};
    for (const [name, counter] of this.impl.counters) {
      counters[name] = counter.snapshot();
    }
    const histograms: Record<string, HistogramEntry[]> = {};
    for (const [name, histogram] of this.impl.histograms) {
      histograms[name] = histogram.snapshot();
    }
    const gauges: Record<string, GaugeEntry[]> = {};
    for (const [name, gauge] of this.impl.gauges) {
      gauges[name] = gauge.snapshot();
    }
    return {
      counters,
      histograms,
      gauges,
      timestamp: new Date().toISOString(),
    };
  }
}
