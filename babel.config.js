module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      'babel-preset-expo',
      ['@babel/preset-react', { runtime: 'automatic' }],
      '@babel/preset-typescript',
    ],
    plugins: ['@babel/plugin-transform-class-static-block'],
  };
};
