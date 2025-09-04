import React, { Suspense } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { createValidateParams } from '@/lib/validateParams';
import { Spinner } from '@/ui/primitives';
import ErrorBoundary from '@/shared/ErrorBoundary';
import { useLanguage } from '@/ui/ThemeProvider';

const ProductScreen = React.lazy(() => import('./_ProductScreen'));
const validateParams = createValidateParams(z.object({ id: z.string() }));

export default function ProductScreenRoute() {
  const { t } = useLanguage();
  const params = validateParams(useLocalSearchParams());
  if (!params.success) {
    return <Text>{t('product.invalid')}</Text>;
  }
  return (
    <Suspense fallback={<Spinner />}>
      <ErrorBoundary>
        <ProductScreen id={params.data.id} />
      </ErrorBoundary>
    </Suspense>
  );
}
