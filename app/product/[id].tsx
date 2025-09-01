import React, { Suspense } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { createValidateParams } from '@/lib/validateParams';
import Spinner from '../../components/ui/Spinner';

const ProductScreen = React.lazy(() => import('./_ProductScreen'));
const validateParams = createValidateParams(z.object({ id: z.string() }));

export default function ProductScreenRoute() {
  const params = validateParams(useLocalSearchParams());
  if (!params.success) {
    return <Text>Invalid product</Text>;
  }
  return (
    <Suspense fallback={<Spinner label="Product" />}> 
      <ProductScreen id={params.data.id} />
    </Suspense>
  );
}
