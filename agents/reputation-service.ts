import { Store } from '@/types';

export interface ReputationMetrics {
  reviewSum: number;
  reviewCount: number;
  reliability: number;
  score: number;
}

export type ScoreUpdateListener = (
  id: string,
  score: number,
  metrics?: ReputationMetrics,
) => void;

export class ReputationService {
  private metrics: Map<string, ReputationMetrics> = new Map();

  private subscribers: Set<ScoreUpdateListener> = new Set();

  private ensureMetrics(id: string): ReputationMetrics {
    let entry = this.metrics.get(id);
    if (!entry) {
      entry = { reviewSum: 0, reviewCount: 0, reliability: 0, score: 0 };
      this.metrics.set(id, entry);
    }
    return entry;
  }

  private calculateScore(entry: ReputationMetrics): number {
    const avg = entry.reviewCount > 0 ? entry.reviewSum / entry.reviewCount : 0;
    return (avg + entry.reliability * 5) / 2;
  }

  private notify(id: string, metrics: ReputationMetrics): void {
    const snapshot: ReputationMetrics = { ...metrics };
    this.subscribers.forEach((cb) => cb(id, snapshot.score, snapshot));
  }

  recordReview(id: string, rating: number): { score: number; metrics: ReputationMetrics } {
    const entry = this.ensureMetrics(id);
    entry.reviewSum += rating;
    entry.reviewCount += 1;
    const score = this.calculateScore(entry);
    entry.score = score;
    return { score, metrics: { ...entry } };
  }

  rollbackReview(id: string, rating: number): { score: number; metrics: ReputationMetrics } {
    const entry = this.ensureMetrics(id);
    entry.reviewSum -= rating;
    entry.reviewCount = Math.max(0, entry.reviewCount - 1);
    if (entry.reviewCount === 0) {
      entry.reviewSum = 0;
    }
    entry.score = this.calculateScore(entry);
    return { score: entry.score, metrics: { ...entry } };
  }

  setReliability(
    id: string,
    reliability: number,
  ): {
    score: number;
    previousReliability: number;
    previousScore: number;
    metrics: ReputationMetrics;
  } {
    const entry = this.ensureMetrics(id);
    const previousReliability = entry.reliability;
    const previousScore = entry.score;
    entry.reliability = reliability;
    entry.score = this.calculateScore(entry);
    return {
      score: entry.score,
      previousReliability,
      previousScore,
      metrics: { ...entry },
    };
  }

  restoreReliability(
    id: string,
    previous: number,
    previousScore?: number,
  ): { score: number; metrics: ReputationMetrics } {
    const entry = this.ensureMetrics(id);
    entry.reliability = previous;
    entry.score = typeof previousScore === 'number' ? previousScore : this.calculateScore(entry);
    return { score: entry.score, metrics: { ...entry } };
  }

  confirmScore(id: string, score: number): void {
    const entry = this.ensureMetrics(id);
    entry.score = score;
    this.notify(id, entry);
  }

  clear(id: string): void {
    this.metrics.delete(id);
  }

  getScore(id: string): number {
    return this.metrics.get(id)?.score ?? 0;
  }

  subscribe(cb: ScoreUpdateListener): () => void {
    this.subscribers.add(cb);
    return () => this.unsubscribe(cb);
  }

  unsubscribe(cb: ScoreUpdateListener): void {
    this.subscribers.delete(cb);
  }

  hydrate(id: string, store: Pick<Store, 'reputation'> | null | undefined): void {
    if (!store || typeof store.reputation !== 'number') return;
    const entry = this.ensureMetrics(id);
    entry.score = store.reputation;
  }
}

const reputationService = new ReputationService();

export default reputationService;
