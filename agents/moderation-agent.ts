import { randomUUID } from 'crypto';
import { Report } from '../types';
import { addReport, listReports, removeReport } from '../services/tonReports';
import ensureTonWallet from '../utils/ensureTonWallet';

class ModerationAgent {
  private async ensureWallet() {
    const { address } = await ensureTonWallet(
      'Please connect your TON wallet to report items.',
    );
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
