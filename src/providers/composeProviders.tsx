import React from 'react';

export interface ProviderConfig {
  readonly component: React.ComponentType<React.PropsWithChildren<any>>;
  readonly props?: Record<string, unknown>;
}

export function composeProviders(
  providers: readonly ProviderConfig[],
  children: React.ReactNode,
): React.ReactElement {
  return providers.reduceRight<React.ReactElement>(
    (acc, { component: Component, props }) =>
      React.createElement(Component, props ?? {}, acc),
    React.createElement(React.Fragment, null, children),
  );
}
