import React from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { z } from 'zod';
import { createValidateParams } from '@/lib/validateParams';
import StorefrontScreen from '..';

const validateParams = createValidateParams(z.object({ id: z.string() }));

export default function CategoryScreen() {
  const parsed = validateParams(useLocalSearchParams());
  if (!parsed.success) {
    return <Text>Invalid category</Text>;
  }
  return <StorefrontScreen initialCategory={parsed.data.id} />;
}
