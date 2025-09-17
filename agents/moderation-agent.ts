import { uuid } from '@/utils/uuid';
import { Report } from '@/types';
import { assertNearChain } from '@/services/chain';
import { addReport, listReports, removeReport } from '@/features/reviews/services/nearReports';
import ensureNearWallet from '@/utils/ensureNearWallet';
import { normalizeMessage } from '../lib/normalizeMessage';

assertNearChain();

// TODO:TODO-116 Add rate limiting and abuse heuristics to ModerationAgent to prevent automated spam reports.
// TODO:REC-216 Feed moderation events into analytics topics so trust & safety dashboards stay up to date.
class ModerationAgent {
  private async ensureWallet() {
    const { address, publicKey } = await ensureNearWallet(
      'Please connect your NEAR wallet to report items.',
    );
    return { address, publicKey };
  }

  async reportProduct(productId: string, reason: string): Promise<void> {
    const { address } = await this.ensureWallet();
    const report = normalizeMessage<Report>('Report', {
      id: uuid(),
      type: 'product',
      targetId: productId,
      reason,
      reporter: address,
      timestamp: Date.now(),
    });
    await addReport(report);
  }

  async reportStore(storeId: string, reason: string): Promise<void> {
    const { address } = await this.ensureWallet();
    const report = normalizeMessage<Report>('Report', {
      id: uuid(),
      type: 'store',
      targetId: storeId,
      reason,
      reporter: address,
      timestamp: Date.now(),
    });
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
