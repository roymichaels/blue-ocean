import { sha256 } from '@noble/hashes/sha256';
import { canonicalJson } from '@/utils/serialization';

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
    const hash = Buffer.from(sha256(Buffer.from(canonicalJson(data)))).toString('hex');
    return `ipfs://${hash}`;
  }
}

export default IpfsService.getInstance();
