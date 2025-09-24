// Restore Expo Router entry now that the document and CSS are stable.
import './polyfills';
import { AppRegistry } from 'react-native';
import App from './App';

const GLOBAL_STYLE_RULES = `
  html, body, #root, #app-root { height: 100% !important; margin: 0; padding: 0; }
  html { min-height: 100%; }
  body { background: #0b0b0b; }
`;

if (typeof document !== 'undefined') {
  try {
    const style = document.createElement('style');
    style.textContent = GLOBAL_STYLE_RULES;
    document.head.appendChild(style);

    const existingRoot =
      document.getElementById('root') ?? document.getElementById('app-root');
    const root =
      existingRoot instanceof HTMLElement
        ? existingRoot
        : document.body.appendChild(
            Object.assign(document.createElement('div'), { id: 'root' }),
          );

    AppRegistry.registerComponent('main', () => App);
    AppRegistry.runApplication('main', {
      rootTag: root,
      initialProps: {},
      hydrate: false,
    } as any);
  } catch (err) {
    console.error('Failed to start app', err);
  }
}
