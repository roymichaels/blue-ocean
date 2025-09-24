import {
  isUiV2Enabled,
  isDataV2Enabled,
  getAdminBootstrapFlag,
} from '@/services/config';

export const flags = {
  UI_V2: isUiV2Enabled(),
  DATA_V2: isDataV2Enabled(),
  ADMIN_BOOTSTRAP_V2: getAdminBootstrapFlag(),
};

export default flags;

