const React = require('react');

const SafeAreaView = ({ children, style, ...rest }) =>
  React.createElement('SafeAreaView', { style, ...rest }, children);

module.exports = {
  SafeAreaView,
  SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
  SafeAreaInsetsContext: { Provider: ({ children }) => children },
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
};

