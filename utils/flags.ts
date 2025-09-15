import {
  isUiV2Enabled,
  isDataV2Enabled,
  isAdminBootstrapV2Enabled,
} from '@/services/config';

export const flags = {
  UI_V2: isUiV2Enabled(),
  DATA_V2: isDataV2Enabled(),
  ADMIN_BOOTSTRAP_V2: isAdminBootstrapV2Enabled(),
};

export default flags;

