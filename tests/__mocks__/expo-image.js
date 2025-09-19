const React = require('react');

const ExpoImage = ({ source, style, ...rest }) =>
  React.createElement('ExpoImage', { source, style, ...rest });

module.exports = {
  __esModule: true,
  Image: ExpoImage,
  ImageBackground: ExpoImage,
  default: ExpoImage,
};
