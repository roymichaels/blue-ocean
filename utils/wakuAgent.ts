import { isWakuConfigured } from '../lib/waku/isWakuConfigured';

/**
 * Simple in-memory agent that can broadcast updates over Waku.
 * The actual Waku send function is provided by subclasses.
 */
export default class WakuAgent<T extends { id: string }> {
  protected store: Map<string, T> = new Map();

  constructor(private sendFn: (item: T) => Promise<void>) {}

  getAll(): T[] {
    return Array.from(this.store.values());
  }

  get(id: string): T | undefined {
    return this.store.get(id);
  }

  async add(item: T): Promise<void> {
    this.store.set(item.id, item);
    await this.broadcast(item);
  }

  async update(item: T): Promise<void> {
    this.store.set(item.id, item);
    await this.broadcast(item);
  }

  async remove(id: string): Promise<void> {
    this.store.delete(id);
  }

  protected async broadcast(item: T) {
    try {
      if (await isWakuConfigured()) {
        await this.sendFn(item);
      }
    } catch (e) {
      console.error('Failed to broadcast Waku message', e);
    }
  }
}

