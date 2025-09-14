import 'react';

declare module 'react' {
  // React 18 types allow FunctionComponent to return ReactNode | Promise<ReactNode>
  // which is incompatible with react-test-renderer typings. Override the
  // signature to match ReactElement return for tests.
  // eslint-disable-next-line @typescript-eslint/ban-types
  interface FunctionComponent<P = {}> {
    (props: P, context?: any): ReactElement<any, any> | null;
  }
}

