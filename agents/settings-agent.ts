import { sendWakuSettingsUpdate } from '../lib/waku/sendWakuSettingsUpdate';
import { isWakuConfigured } from '../lib/waku/isWakuConfigured';

class SettingsAgent {
  private store: Record<string, string> = {};

  getAll(): Record<string, string> {
    return { ...this.store };
  }

  get(key: string): string | undefined {
    return this.store[key];
  }

  async set(key: string, value: string): Promise<void> {
    this.store[key] = value;
    try {
      if (await isWakuConfigured()) {
        const now = Date.now();
        await sendWakuSettingsUpdate(key, value, now, now);
      }
    } catch (e) {
      console.error('Failed to broadcast settings update', e);
    }
  }
}

export default new SettingsAgent();
