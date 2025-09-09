import fs from 'fs';
import path from 'path';

describe('vault env loader', () => {
  const vaultFile = path.join(process.cwd(), 'temp.env.vault');

  afterEach(() => {
    delete process.env.VAULT_ENV;
    delete process.env.SECRET_TOKEN;
    if (fs.existsSync(vaultFile)) fs.unlinkSync(vaultFile);
  });

  it('loads variables from vault file', () => {
    fs.writeFileSync(vaultFile, 'SECRET_TOKEN=abc123');
    process.env.VAULT_ENV = vaultFile;
    jest.resetModules();
    const cfg = require('@/config').default;
    expect(cfg.SECRET_TOKEN).toBe('abc123');
  });
});
