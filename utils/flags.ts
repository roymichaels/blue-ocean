import { isUiV2Enabled, isDataV2Enabled } from '@/services/config';

export const flags = {
  UI_V2: isUiV2Enabled(),
  DATA_V2: isDataV2Enabled(),
};

export default flags;

