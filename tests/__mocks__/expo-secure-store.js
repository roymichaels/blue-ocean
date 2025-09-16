const store = new Map();

const setItemAsync = jest.fn(async (key, value) => {
  store.set(key, value);
});

const getItemAsync = jest.fn(async (key) => {
  return store.has(key) ? (store.get(key) ?? null) : null;
});

const deleteItemAsync = jest.fn(async (key) => {
  store.delete(key);
});

const __reset = () => {
  store.clear();
  setItemAsync.mockClear();
  getItemAsync.mockClear();
  deleteItemAsync.mockClear();
};

module.exports = {
  setItemAsync,
  getItemAsync,
  deleteItemAsync,
  __reset,
  __store: store,
};
