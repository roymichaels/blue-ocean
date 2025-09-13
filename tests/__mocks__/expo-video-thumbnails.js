module.exports = {
  __esModule: true,
  getThumbnailAsync: jest.fn(async (uri, opts) => ({ uri: `${uri}.thumb` })),
  default: { getThumbnailAsync: jest.fn(async (uri, opts) => ({ uri: `${uri}.thumb` })) },
};

