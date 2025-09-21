import { AppRegistry } from 'react-native';
import App from '../App';

const APP_NAME = 'main';

AppRegistry.registerComponent(APP_NAME, () => App);

if (typeof document !== 'undefined') {
  const rootTag = document.getElementById('root') ?? document.body.appendChild(document.createElement('div'));
  AppRegistry.runApplication(APP_NAME, {
    initialProps: {},
    rootTag,
  });
}
