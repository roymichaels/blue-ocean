import { Blockchain } from '@ton/sandbox';
import { toNano } from 'ton-core';
import { Settings } from '../contracts/Settings.tact_Settings';

jest.mock('../services/tonKvStore', () => require('./tonKvMock'));
jest.mock('../utils/appConfig', () => ({
  getWakuBootstrapNodes: () => ['mock'],
}));
const sendMock = jest.fn();
jest.mock(
  '@waku/sdk',
  () => ({
    Protocols: { Relay: 0 },
    createLightNode: jest.fn().mockResolvedValue({
      start: jest.fn(),
      lightPush: { send: sendMock },
      relay: { addObserver: jest.fn(), deleteObserver: jest.fn() },
    }),
    waitForRemotePeer: jest.fn().mockResolvedValue(undefined),
    createEncoder: jest.fn(() => 'encoder'),
    createDecoder: jest.fn(),
    utf8ToBytes: (s: string) => new TextEncoder().encode(s),
    bytesToUtf8: (b: Uint8Array) => new TextDecoder().decode(b),
  }),
  { virtual: true },
);

import { __clear } from './tonKvMock';
let setFeeBps: any, getFeeBps: any, setAdmins: any, getAdmins: any;
beforeAll(async () => {
  jest.unmock('../services/tonSettings');
  const mod = await import('../services/tonSettings');
  setFeeBps = mod.setFeeBps;
  getFeeBps = mod.getFeeBps;
  setAdmins = mod.setAdmins;
  getAdmins = mod.getAdmins;
});

describe('Settings contract', () => {
  it('enforces admin gating and updates state', async () => {
    const blockchain = await Blockchain.create();
    const admin = await blockchain.treasury('admin');
    const user = await blockchain.treasury('user');
    const contract = blockchain.openContract(await Settings.fromInit(admin.address, 0n, '', '', ''));

    await contract.send(user.getSender(), { value: toNano('1') }, { $$type: 'SetFeeBps', value: 200n });
    expect(await contract.getFeeBps()).toBe(0n);

    await contract.send(admin.getSender(), { value: toNano('1') }, { $$type: 'SetFeeBps', value: 150n });
    await contract.send(admin.getSender(), { value: toNano('1') }, { $$type: 'SetBrand', value: 'BrandX' });
    await contract.send(admin.getSender(), { value: toNano('1') }, { $$type: 'SetMoonpayKey', value: 'Moon' });
    await contract.send(admin.getSender(), { value: toNano('1') }, { $$type: 'SetEscrowPolicy', value: 'Policy' });

    expect(await contract.getFeeBps()).toBe(150n);
    expect(await contract.getBrand()).toBe('BrandX');
    expect(await contract.getMoonpayKey()).toBe('Moon');
    expect(await contract.getEscrowPolicy()).toBe('Policy');
  });
});

describe('tonSettings service', () => {
  beforeEach(() => {
    __clear();
    sendMock.mockClear();
  });

  it('updates feeBps and admins and emits events', async () => {
    await setFeeBps(250, 'actor');
    expect(await getFeeBps()).toBe(250);
    await setAdmins(['addr1', 'addr2'], 'actor');
    expect(await getAdmins()).toEqual(['addr1', 'addr2']);

    expect(sendMock).toHaveBeenCalledTimes(2);
    const payloads = sendMock.mock.calls.map((c) =>
      JSON.parse(new TextDecoder().decode(c[1].payload)),
    );
    expect(payloads[0]).toEqual(
      expect.objectContaining({
        type: 'settings.write',
        key: 'feeBps',
        value: '250',
        actor: 'actor',
        timestamp: expect.any(Number),
      }),
    );
    expect(payloads[1]).toEqual(
      expect.objectContaining({
        type: 'settings.write',
        key: 'admins',
        value: JSON.stringify(['addr1', 'addr2']),
        actor: 'actor',
        timestamp: expect.any(Number),
      }),
    );
  });
});
