import MeteredBillingService from './MeteredBillingService';

const meteredBilling = MeteredBillingService.getInstance();

export * from './types';
export { useBillingSummary } from './hooks';
export { MeteredBillingService };
export { meteredBilling };
export default meteredBilling;
