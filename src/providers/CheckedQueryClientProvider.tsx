import React from 'react';
import {
  QueryClientProvider as BaseQueryClientProvider,
  type QueryClientProviderProps,
} from '@tanstack/react-query';

let mountedInstances = 0;

export function CheckedQueryClientProvider(props: QueryClientProviderProps) {
  if (__DEV__) {
    mountedInstances += 1;
    if (mountedInstances > 1) {
      throw new Error('Multiple QueryClientProvider instances detected. Only one should be mounted.');
    }
  }

  React.useEffect(() => {
    return () => {
      if (__DEV__) {
        mountedInstances -= 1;
      }
    };
  }, []);

  return React.createElement(BaseQueryClientProvider, props);
}
