import { ReputationService } from '@/agents/reputation-service';

const STORE_ID = 'store-1';

describe('ReputationService', () => {
  it('calculates blended scores from reviews and reliability', () => {
    const service = new ReputationService();

    const first = service.recordReview(STORE_ID, 4);
    expect(first.score).toBeCloseTo(2); // average 4, reliability 0 => score 2

    const second = service.recordReview(STORE_ID, 2);
    // avg = 3, reliability 0 => score 1.5
    expect(second.score).toBeCloseTo(1.5);

    const reliabilityUpdate = service.setReliability(STORE_ID, 0.8);
    // avg = 3, reliability = 0.8 -> score = (3 + 4) / 2 = 3.5
    expect(reliabilityUpdate.score).toBeCloseTo(3.5);

    service.confirmScore(STORE_ID, reliabilityUpdate.score);
    expect(service.getScore(STORE_ID)).toBeCloseTo(3.5);
  });

  it('rolls back review updates when requested', () => {
    const service = new ReputationService();
    service.recordReview(STORE_ID, 5);
    service.recordReview(STORE_ID, 1);

    const rollback = service.rollbackReview(STORE_ID, 1);
    expect(rollback.metrics.reviewCount).toBe(1);
    expect(rollback.metrics.reviewSum).toBe(5);
    expect(rollback.score).toBeCloseTo(2.5);
  });
});
