import WakuAgent from '../utils/wakuAgent';

class TestAgent extends WakuAgent<{ id: string }> {
  constructor(ttl: number, onUpdate: () => void) {
    super(async () => {}, {
      requireSignature: false,
      hashCacheTTL: ttl,
      onUpdate,
    });
  }
}

describe('hashCache eviction', () => {
  it('evicts entries after TTL', async () => {
    let updates = 0;
    const agent = new TestAgent(10, () => {
      updates += 1;
    });
    const payload = JSON.stringify({ id: '1' });
    await agent.processPayload(payload);
    await agent.processPayload(payload);
    expect(updates).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 20));
    await agent.processPayload(payload);
    expect(updates).toBe(2);
  });
});
