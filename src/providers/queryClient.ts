import { QueryClient } from '@tanstack/react-query';

declare global {
  // React Native fast refresh re-evaluates modules; store the client globally to avoid recreation.
  // eslint-disable-next-line no-var
  var __queryClient: QueryClient | undefined;
}

export const queryClient =
  globalThis.__queryClient ?? (globalThis.__queryClient = new QueryClient());

export default queryClient;
