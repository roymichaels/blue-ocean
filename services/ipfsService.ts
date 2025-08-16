import { createHash } from 'crypto';

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
    const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    return `ipfs://${hash}`;
  }
}

export default IpfsService.getInstance();
