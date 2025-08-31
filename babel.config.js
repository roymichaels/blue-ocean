// babel.config.js
module.exports = function (api) {
  api.cache(true);

  // Tell expo-router where /app lives every time, on any OS/command
  process.env.EXPO_PROJECT_ROOT = __dirname;
  process.env.EXPO_ROUTER_APP_ROOT = "./app";

  return {
    presets: ["babel-preset-expo"],
    // SDK 50+: expo-router/babel is built into the preset; don't add it here.
    plugins: [],
  };
};
