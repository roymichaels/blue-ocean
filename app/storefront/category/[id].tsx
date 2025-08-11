import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import StorefrontScreen from '..';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StorefrontScreen initialCategory={id} />;
}
