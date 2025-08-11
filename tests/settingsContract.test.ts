import { Blockchain } from '@ton/sandbox';
import { toNano } from 'ton-core';
import { Settings } from '../contracts/Settings.tact_Settings';

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
