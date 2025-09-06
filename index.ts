// Restore Expo Router entry now that the document and CSS are stable.
import './polyfills';
import { AppRegistry } from 'react-native';
import App from './App';

process.env.EXPO_PUBLIC_USE_ROUTER = '1';

// Ensure root has height even without +html Document and mount manually
try {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `html, body, #root, #app-root { height: 100% !important; margin: 0; padding: 0; } body { background: transparent; }`;
    document.head.appendChild(style);
    let root = document.getElementById('root') || document.getElementById('app-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'root';
      document.body.appendChild(root);
    }
    AppRegistry.registerComponent('main', () => App);
    AppRegistry.runApplication('main', {
      rootTag: root,
      initialProps: {},
      hydrate: false,
    } as any);
  }
} catch {}
