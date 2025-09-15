declare module '@waku/core/dist/lib/message/version_0' {
  import type { EncoderOptions, IRoutingInfo } from '@waku/interfaces/dist/message';
  export type Decoder = any;
  export function createDecoder(contentTopic: string, routingInfo?: IRoutingInfo): Decoder;
  export function createEncoder(options: EncoderOptions): any;
}
