import { sha256 } from '@noble/hashes/sha256';

class IpfsService {
  private static instance: IpfsService;

  private constructor() {}

  static getInstance(): IpfsService {
    if (!IpfsService.instance) {
      IpfsService.instance = new IpfsService();
    }
    return IpfsService.instance;
  }

  async pinFile(uri: string, _name?: string): Promise<string> {
    return uri;
  }

  async pinJson(data: any): Promise<string> {
    const hash = Buffer.from(sha256(Buffer.from(JSON.stringify(data)))).toString('hex');
    return `ipfs://${hash}`;
  }
}

export default IpfsService.getInstance();
