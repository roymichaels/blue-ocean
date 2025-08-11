import { Store } from '../types';
import tonAuth from '../services/tonAuth';
import { setStore, getStore, listStores, removeStore } from '../services/tonStores';

class StoresAgent {
  private async ensureWallet() {
    const address = tonAuth.getAddress();
    const publicKey = tonAuth.getTonPublicKey();
    if (!address || !publicKey) {
      await tonAuth.openModal();
      throw new Error('Please connect your TON wallet to manage stores.');
    }
  }

  async add(item: Store): Promise<void> {
    await this.ensureWallet();
    await setStore(item);
  }

  async update(item: Store): Promise<void> {
    await this.ensureWallet();
    await setStore(item);
  }

  async remove(id: string): Promise<void> {
    await this.ensureWallet();
    await removeStore(id);
  }

  async get(id: string): Promise<Store | null> {
    return await getStore(id);
  }

  async getAll(): Promise<Store[]> {
    return await listStores();
  }
}

export default new StoresAgent();
