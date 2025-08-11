import fs from 'fs';
import os from 'os';
import path from 'path';
import { deployTonContract } from '../deploy-ton';

const sendTransfer = jest.fn().mockResolvedValue(undefined);
const getSeqno = jest.fn().mockResolvedValue(0);
const open = jest.fn().mockReturnValue({ getSeqno, sendTransfer });

jest.mock('ton-core', () => ({
  __esModule: true,
  TonClient: jest.fn().mockImplementation(() => ({ open })),
  WalletContractV4: { create: jest.fn(() => ({ address: 'addr' })) },
  internal: jest.fn(() => ({})),
}));

jest.mock('@ton/crypto', () => ({
  __esModule: true,
  mnemonicToPrivateKey: jest.fn(async () => ({
    secretKey: Buffer.alloc(0),
    publicKey: Buffer.alloc(0),
  })),
}));

describe('deploy-ton script', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws when contract name missing', async () => {
    await expect(deployTonContract('' as any)).rejects.toThrow('Contract name required');
  });

  it('throws when TON_MNEMONIC missing', async () => {
    await expect(deployTonContract('foo', {} as any)).rejects.toThrow('TON_MNEMONIC not set');
  });

  it('throws when build artifacts are missing', async () => {
    const env: NodeJS.ProcessEnv = { TON_MNEMONIC: 'a b c d e f g h i j k l', NODE_ENV: 'test' };
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-'));
    await expect(deployTonContract('foo', env, tmp)).rejects.toThrow();
  });

  it('sends transfer when artifacts and env are present', async () => {
    const env: NodeJS.ProcessEnv = { TON_MNEMONIC: 'a b c d e f g h i j k l', NODE_ENV: 'test' };
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-'));
    const buildDir = path.join(tmp, 'build');
    fs.mkdirSync(buildDir);
    fs.writeFileSync(path.join(buildDir, 'foo.code.boc'), '');
    fs.writeFileSync(path.join(buildDir, 'foo.data.boc'), '');

    await deployTonContract('foo', env, tmp);

    expect(getSeqno).toHaveBeenCalled();
    expect(sendTransfer).toHaveBeenCalled();
  });
});
