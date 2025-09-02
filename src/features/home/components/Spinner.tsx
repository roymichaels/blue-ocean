import React from 'react';
import BaseSpinner, {
  SpinnerProps as BaseSpinnerProps,
} from '@/components/ui/Spinner';

export type SpinnerProps = BaseSpinnerProps;

export default function Spinner(props: SpinnerProps) {
  return <BaseSpinner {...props} />;
}

