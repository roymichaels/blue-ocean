declare module '@waku/sdk' {
  export type LightNode = any;
  export type DecodedMessage = any;
  export type IDecoder<T> = {
    enqueue: (...args: any[]) => void;
    fromProtoObj: (...args: any[]) => Promise<T | undefined>;
  } & Record<string, any>;
  export type QueryRequestParams = any;
  export const Protocols: Record<string, string>;
  export function createLightNode(...args: any[]): Promise<LightNode>;
  export function waitForRemotePeer(node: LightNode, protocols: unknown[]): Promise<void>;
  export function createEncoder(params: any): any;
  export function createDecoder(...args: any[]): IDecoder<DecodedMessage>;
  export function utf8ToBytes(input: string): Uint8Array;
  export function bytesToUtf8(input: Uint8Array): string;
}

