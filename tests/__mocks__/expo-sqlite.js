module.exports = {
  openDatabaseAsync: jest.fn(async () => ({
    closeAsync: jest.fn(),
    prepareAsync: jest.fn(async () => ({
      executeAsync: jest.fn(async () => ({
        getAllAsync: jest.fn(async () => []),
      })),
      finalizeAsync: jest.fn(),
    })),
  })),
};
