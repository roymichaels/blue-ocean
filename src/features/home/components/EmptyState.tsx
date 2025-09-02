import React from 'react';
import BaseEmptyState, {
  EmptyStateProps as BaseEmptyStateProps,
} from '@/components/ui/EmptyState';

export type EmptyStateProps = BaseEmptyStateProps;

export default function EmptyState(props: EmptyStateProps) {
  return <BaseEmptyState {...props} />;
}

