import fs from 'fs';
import path from 'path';
import PinataService from '@/services/pinata';
import { insertConfig } from '../testUtils';

describe('temporary upload encryption', () => {
  beforeEach(() => {
    insertConfig({ EXPO_PUBLIC_PINATA_JWT: 'jwt-token' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('encrypts and deletes temp file', async () => {
    const tmp = path.join(__dirname, 'tmp.txt');
    fs.writeFileSync(tmp, 'hello');

    const fsPromises = require('fs/promises');
    const writeSpy = jest.spyOn(fsPromises, 'writeFile');
    const unlinkSpy = jest
      .spyOn(fsPromises, 'unlink')
      .mockImplementation(async () => {});

    jest
      .spyOn(global as any, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ IpfsHash: 'cid123' }) } as any);

    const svc = PinataService.getInstance();
    await svc.uploadFile(tmp, 'tmp.txt');

    expect(writeSpy).toHaveBeenCalled();
    expect(unlinkSpy).toHaveBeenCalled();
    const written = writeSpy.mock.calls[0][1];
    expect(written).not.toBe('hello');
    fs.unlinkSync(tmp);
  });
});
