export const routes = {
  home: (params?: Record<string, string | undefined>) => ({
    pathname: '/',
    params,
  }),
  store: (id: string | number) => `/store/${id}`,
  createStore: () => '/stores/create',
  driver: () => '/driver',
};

export type Routes = typeof routes;
