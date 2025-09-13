const React = require('react');

// Return a component for any icon name accessed
const handler = {
  get: function (_target, prop) {
    return function Icon(props) {
      return React.createElement('Icon', { name: String(prop), ...props });
    };
  },
};

module.exports = new Proxy({}, handler);

