import { setValue, listValues, removeValue } from './tonKvStore';
import { Report } from '../types';
import { requireEnv } from '../utils/appConfig';

const ADDRESS = requireEnv('TON_REPORTS_ADDRESS');

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
