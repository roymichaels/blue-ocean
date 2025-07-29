import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import PinataService from './pinata';

const DB_NAME = `${process.env.EXPO_PUBLIC_TENANT || 'app'}.db`;
const DB_PATH = FileSystem.documentDirectory + 'SQLite/' + DB_NAME;
const TMP_ENC_PATH = FileSystem.cacheDirectory + 'app.db.enc';

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(passphrase);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

async function encryptData(data: Uint8Array, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  const ivStr = Buffer.from(iv).toString('base64');
  const dataStr = Buffer.from(new Uint8Array(cipher)).toString('base64');
  return `${ivStr}:${dataStr}`;
}

async function decryptData(data: string, passphrase: string): Promise<Uint8Array> {
  const [ivStr, encStr] = data.split(':');
  const iv = Uint8Array.from(Buffer.from(ivStr, 'base64'));
  const enc = Uint8Array.from(Buffer.from(encStr, 'base64'));
  const key = await deriveKey(passphrase);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, enc);
  return new Uint8Array(plain);
}

class BackupService {
  private static instance: BackupService;
  private constructor() {}

  public static getInstance(): BackupService {
    if (!BackupService.instance) {
      BackupService.instance = new BackupService();
    }
    return BackupService.instance;
  }

  /**
   * Encrypt the local SQLite database and upload it to Pinata.
   * @param passphrase Secret used for AES encryption
   * @param onProgress Optional upload progress callback
   * @returns The Pinata gateway URL of the uploaded backup
   */
  async backupDatabase(
    passphrase: string,
    onProgress?: (percent: number) => void,
  ): Promise<string> {
    const dbBase64 = await FileSystem.readAsStringAsync(DB_PATH, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const data = Uint8Array.from(Buffer.from(dbBase64, 'base64'));
    const enc = await encryptData(data, passphrase);
    await FileSystem.writeAsStringAsync(TMP_ENC_PATH, enc);
    const pinata = PinataService.getInstance();
    const url = await pinata.uploadFile(TMP_ENC_PATH, 'app.db.enc', onProgress);
    await FileSystem.deleteAsync(TMP_ENC_PATH, { idempotent: true });
    return url;
  }

  /**
   * Download an encrypted backup by CID and restore the database.
   * @param cid Pinata CID or gateway URL
   * @param passphrase Secret used for AES decryption
   * @returns Local path of the restored database
   */
  async restoreDatabase(cid: string, passphrase: string): Promise<string> {
    const pinataUrl = cid.startsWith('http') ? cid : `https://gateway.pinata.cloud/ipfs/${cid}`;
    const download = await FileSystem.downloadAsync(pinataUrl, TMP_ENC_PATH);
    const enc = await FileSystem.readAsStringAsync(download.uri);
    const plain = await decryptData(enc, passphrase);
    const base64 = Buffer.from(plain).toString('base64');
    await FileSystem.writeAsStringAsync(DB_PATH, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.deleteAsync(TMP_ENC_PATH, { idempotent: true });
    return DB_PATH;
  }
}

export default BackupService;
