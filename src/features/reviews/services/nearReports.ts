import { setValue, listValues, removeValue } from '@/services/nearKvStore';
import { Report } from '@/types';
import { requireEnv } from '@/utils/appConfig';
import { assertNearChain } from '@/services/chain';

assertNearChain();

const CHAIN = (process.env.EXPO_PUBLIC_CHAIN || '').toLowerCase();
const ADDRESS = CHAIN === 'near' ? requireEnv('NEAR_REPORTS_CONTRACT') : 'near:disabled';

export async function addReport(report: Report) {
  await setValue(ADDRESS, report.id, JSON.stringify(report));
}

export async function listReports(): Promise<Report[]> {
  const items = await listValues(ADDRESS);
  return items.map((i) => JSON.parse(i.value) as Report);
}

export async function removeReport(id: string) {
  await removeValue(ADDRESS, id);
}
