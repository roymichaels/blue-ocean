// @ts-nocheck
import { startStream } from 'near-lake-framework';

export function initLake(config: any) {
  return startStream(config);
}
