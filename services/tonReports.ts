import { setValue, listValues, removeValue } from './tonKvStore';
import { Report } from '../types';
import config from '../utils/appConfig';

const ADDRESS =
  config.TON_REPORTS_ADDRESS ??
  'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c';

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
