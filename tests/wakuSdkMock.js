const { Buffer } = require('buffer');

const createLightNode = jest.fn(async () => ({
  start: jest.fn(),
  stop: jest.fn(),
  lightPush: { send: jest.fn() },
  store: { queryHistory: jest.fn().mockResolvedValue({ messages: [], next: undefined }) },
  relay: {
    addObserver: jest.fn(() => jest.fn()),
    deleteObserver: jest.fn(),
  },
  libp2p: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
}));

const waitForRemotePeer = jest.fn(async () => {});

const Protocols = { Relay: 'relay', Store: 'store' };

const utf8ToBytes = (input) => Buffer.from(input, 'utf-8');
const bytesToUtf8 = (input) => Buffer.from(input).toString('utf-8');

const createEncoder = jest.fn(({ contentTopic }) => ({ contentTopic }));
const createDecoder = jest.fn((contentTopic) => ({
  contentTopic,
  fromProtoObj: jest.fn(async () => undefined),
}));

module.exports = {
  Protocols,
  createLightNode,
  waitForRemotePeer,
  utf8ToBytes,
  bytesToUtf8,
  createEncoder,
  createDecoder,
};


