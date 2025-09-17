export const routes = {
  home: (params?: Record<string, string | undefined>) => ({
    pathname: '/',
    params,
  }),
  store: (id: string | number) => `/store/${id}`,
  createStore: () => '/stores/create',
  driver: () => '/driver',
  recoverAdmin: () => '/auth/recover-admin',
};

export type Routes = typeof routes;
