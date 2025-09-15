const { performance } = require('perf_hooks');

class FakeWakuNetwork {
  constructor() {
    this.subscribers = new Map();
    this.history = [];
  }

  join(id, listener) {
    this.subscribers.set(id, listener);
    return () => this.subscribers.delete(id);
  }

  broadcast(from, envelope) {
    this.history.push(envelope);
    for (const [id, listener] of this.subscribers.entries()) {
      if (id === from) continue;
      setTimeout(() => listener(envelope), 0);
    }
  }

  loadHistory(after) {
    return this.history.filter((entry) => entry.timestamp > after);
  }
}

class FakeS3Store {
  constructor() {
    this.stores = new Map();
  }

  async put(storeId, product) {
    let store = this.stores.get(storeId);
    if (!store) {
      store = new Map();
      this.stores.set(storeId, store);
    }
    store.set(product.id, structuredClone(product));
  }

  async list(storeId) {
    const store = this.stores.get(storeId);
    if (!store) return [];
    return Array.from(store.values()).map((item) => structuredClone(item));
  }
}

class AppInstance {
  constructor(id, network, s3) {
    this.id = id;
    this.network = network;
    this.s3 = s3;
    this.products = new Map();
    this.online = false;
    this.unsubscribe = null;
    this.lastTimestamp = 0;
    this.onProduct = undefined;
  }

  async goOnline() {
    if (this.online) return;
    this.unsubscribe = this.network.join(this.id, (envelope) => {
      this.products.set(envelope.product.id, structuredClone(envelope.product));
      this.lastTimestamp = Math.max(this.lastTimestamp, envelope.timestamp);
      if (this.onProduct) this.onProduct(structuredClone(envelope.product), envelope.timestamp);
    });
    this.online = true;
  }

  async goOffline() {
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = null;
    this.online = false;
  }

  async addProduct(product) {
    const cloned = structuredClone(product);
    this.products.set(cloned.id, cloned);
    await this.s3.put(cloned.storeId, cloned);
    if (this.online) {
      this.network.broadcast(this.id, {
        product: cloned,
        sender: this.id,
        timestamp: Date.now(),
      });
    }
  }

  async hydrateFromS3(storeId) {
    const snapshot = await this.s3.list(storeId);
    for (const product of snapshot) {
      this.products.set(product.id, product);
    }
    this.lastTimestamp = Date.now();
    return snapshot.length;
  }

  async replayMissedMessages() {
    const missed = this.network.loadHistory(this.lastTimestamp);
    for (const envelope of missed) {
      if (envelope.sender === this.id) continue;
      this.products.set(envelope.product.id, structuredClone(envelope.product));
      this.lastTimestamp = Math.max(this.lastTimestamp, envelope.timestamp);
    }
    return missed.length;
  }

  snapshot() {
    return Array.from(this.products.values()).map((item) => structuredClone(item));
  }
}

function structuredClone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function run() {
  const network = new FakeWakuNetwork();
  const s3 = new FakeS3Store();

  const baseProduct = {
    id: 'sku-1',
    name: 'Cold Brew Concentrate',
    description: 'Strong coffee for iced drinks',
    price: 12.0,
    storeId: 'default',
    stock: 25,
    rating: 0,
    reviews: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const alice = new AppInstance('alice', network, s3);
  const bob = new AppInstance('bob', network, s3);

  await alice.goOnline();
  await bob.goOnline();

  const wakuStart = performance.now();
  const wakuLatency = await new Promise((resolve) => {
    bob.onProduct = () => {
      resolve(performance.now() - wakuStart);
    };
    void alice.addProduct({ ...baseProduct, id: 'sku-online' });
  });
  await new Promise((resolve) => setTimeout(resolve, 10));

  if (bob.snapshot().length !== 1) {
    throw new Error('Bob did not receive the live product update.');
  }

  await alice.goOffline();
  await bob.goOffline();

  await alice.addProduct({ ...baseProduct, id: 'sku-offline', name: 'Offline Only' });

  const hydrationStart = performance.now();
  const beforeHydrate = bob.snapshot();
  await bob.goOnline();
  const replayed = await bob.replayMissedMessages();
  await bob.hydrateFromS3('default');
  const hydrationDuration = performance.now() - hydrationStart;

  const hasOfflineProduct = bob
    .snapshot()
    .some((product) => product.id === 'sku-offline');

  if (replayed !== 0 || !hasOfflineProduct) {
    throw new Error('Offline hydration did not load expected product.');
  }

  console.info('[waku-sync] Live propagation latency:', `${wakuLatency.toFixed(2)}ms`);
  const added = bob.snapshot().length - beforeHydrate.length;
  console.info('[waku-sync] Hydration duration:', `${hydrationDuration.toFixed(2)}ms`, 'added', added, 'product(s)');
}

run().catch((err) => {
  console.error('[waku-sync] Test run failed:', err);
  process.exitCode = 1;
});
