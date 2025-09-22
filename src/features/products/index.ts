export { default as ProductCard } from './ProductCard';
export { ProductCardSkeleton } from './ProductCard';
export { default as ProductGrid } from './components/ProductGrid';
export { default as ProductFormModal } from './components/ProductFormModal';
export { default as PricingTierFormModal } from './components/PricingTierFormModal';
export { default as SubcategoryPicker } from './components/SubcategoryPicker';
export * from './hooks';

// Some heavy, web-only uploader utilities pull in ESM-only Expo modules.
// Export them conditionally to avoid Jest transform issues in Node.
let AdminBulkUploader: any = null;
let BulkProductUploader: any = null;
let processRecords: any = null;
try {
  if (!process.env.JEST_WORKER_ID) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    AdminBulkUploader = require('./components/AdminBulkUploader').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bulk = require('./components/BulkProductUploader');
    BulkProductUploader = bulk.default;
    processRecords = bulk.processRecords;
  }
} catch {}

export { AdminBulkUploader, BulkProductUploader, processRecords };
