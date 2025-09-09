export const routes = {
  home: (params?: Record<string, string | undefined>) => ({
    pathname: '/',
    params,
  }),
  store: (id: string | number) => `/store/${id}`,
};

export type Routes = typeof routes;
