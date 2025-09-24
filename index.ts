// Restore Expo Router entry now that the document and CSS are stable.
import './polyfills';
import { AppRegistry } from 'react-native';
import App from './App';

const GLOBAL_STYLE_RULES = `
  html, body, #root, #app-root { height: 100% !important; margin: 0; padding: 0; }
  html { min-height: 100%; }
  body { background: #0b0b0b; }
`;

function injectGlobalStyles() {
  const style = document.createElement('style');
  style.innerHTML = GLOBAL_STYLE_RULES;
  document.head.appendChild(style);
}

function ensureRootContainer(): HTMLElement {
  const rootElement =
    document.getElementById('root') ?? document.getElementById('app-root');
  if (rootElement instanceof HTMLElement) {
    return rootElement;
  }

  const root = document.createElement('div');
  root.id = 'root';
  document.body.appendChild(root);
  return root;
}

function bootstrap() {
  if (typeof document === 'undefined') {
    return;
  }

  injectGlobalStyles();
  const root = ensureRootContainer();
  AppRegistry.registerComponent('main', () => App);
  AppRegistry.runApplication('main', {
    rootTag: root,
    initialProps: {},
    hydrate: false,
  } as any);
}

try {
  bootstrap();
} catch (err) {
  console.error('Failed to start app', err);
}
