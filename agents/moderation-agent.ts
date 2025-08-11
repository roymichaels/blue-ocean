import { randomUUID } from 'crypto';
import tonAuth from '../services/tonAuth';
import { Report } from '../types';
import { addReport, listReports, removeReport } from '../services/tonReports';

class ModerationAgent {
  private async ensureWallet() {
    const address = tonAuth.getAddress();
    const publicKey = tonAuth.getTonPublicKey();
    if (!address || !publicKey) {
      await tonAuth.openModal();
      throw new Error('Please connect your TON wallet to report items.');
    }
    return { address };
  }

  async reportProduct(productId: string, reason: string): Promise<void> {
    const { address } = await this.ensureWallet();
    const report: Report = {
      id: randomUUID(),
      type: 'product',
      targetId: productId,
      reason,
      reporter: address,
      timestamp: Date.now(),
    };
    await addReport(report);
  }

  async reportStore(storeId: string, reason: string): Promise<void> {
    const { address } = await this.ensureWallet();
    const report: Report = {
      id: randomUUID(),
      type: 'store',
      targetId: storeId,
      reason,
      reporter: address,
      timestamp: Date.now(),
    };
    await addReport(report);
  }

  async getAll(): Promise<Report[]> {
    return await listReports();
  }

  async remove(id: string): Promise<void> {
    await removeReport(id);
  }
}

export default new ModerationAgent();
