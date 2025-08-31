export const flags = {
  UI_V2: (process.env.EXPO_PUBLIC_FEATURE_UI_V2 ?? '0') === '1',
  DATA_V2: (process.env.EXPO_PUBLIC_FEATURE_DATA_V2 ?? '0') === '1',
};

export default flags;

