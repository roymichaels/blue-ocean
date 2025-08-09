import { TonConnectUI } from '@tonconnect/ui';

class TonAuthService {
  private static instance: TonAuthService;
  private tonConnectUI: TonConnectUI | null = null;
  private publicKey: string | null = null;
  private address: string | null = null;

  private constructor() {
    this.init();
  }

  private init() {
    if (typeof window !== 'undefined') {
      try {
        const manifestUrl = process.env.NODE_ENV === 'development'
          ? new URL('/tonconnect-manifest.json', window.location.origin).href
          : '/tonconnect-manifest.json';
        this.tonConnectUI = new TonConnectUI({ manifestUrl });
        this.tonConnectUI.onStatusChange((wallet: any | null) => {
          this.publicKey = wallet?.account?.publicKey ?? null;
          this.address = wallet?.account?.address ?? null;
        });
      } catch (e) {
        console.error('Failed to initialize TonConnectUI', e);
      }
    }
  }

  public static getInstance(): TonAuthService {
    if (!TonAuthService.instance) {
      TonAuthService.instance = new TonAuthService();
    }
    return TonAuthService.instance;
  }

  public getTonPublicKey(): string | null {
    return this.publicKey;
  }

  public getAddress(): string | null {
    return this.address;
  }

  public async requestSignature(payload: any): Promise<string | null> {
    if (!this.tonConnectUI) return null;
    const result = await this.tonConnectUI.signData(payload);
    return result.signature;
  }

  public async openModal(): Promise<void> {
    if (!this.tonConnectUI) return;
    await this.tonConnectUI.openModal();
  }
}

const tonAuth = TonAuthService.getInstance();
export const getTonPublicKey = () => tonAuth.getTonPublicKey();
export default tonAuth;
