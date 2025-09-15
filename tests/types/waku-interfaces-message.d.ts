declare module '@waku/interfaces/dist/message' {
  export interface IRoutingInfo {}
  export interface EncoderOptions {
    contentTopic: string;
    routingInfo?: IRoutingInfo;
    [key: string]: any;
  }
}
