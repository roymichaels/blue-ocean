declare module 'matrix-js-sdk' {
  export const createClient: any;

  export interface MatrixClient {
    [key: string]: any;
    initRustCrypto(options?: { useIndexedDB?: boolean }): Promise<CryptoApi>;
  }

  export interface MatrixEvent {
    [key: string]: any;
  }

  export interface Room {
    [key: string]: any;
  }

  export interface RoomMember {
    [key: string]: any;
  }

  export class MemoryStore {
    constructor(...args: any[]);
    [key: string]: any;
  }

  export class IndexedDBCryptoStore {
    constructor(...args: any[]);
    [key: string]: any;
  }

  export interface CryptoApi {
    [key: string]: any;
  }

  export const ClientEvent: any;
  export type ClientEvent = any;
  export const RoomEvent: any;
  export type RoomEvent = any;
  export const RoomMemberEvent: any;
  export type RoomMemberEvent = any;
  export const HttpApiEvent: any;
  export type HttpApiEvent = any;
  export const SyncState: any;
  export type SyncState = any;
  export const NotificationCountType: any;
  export type NotificationCountType = any;
  export const Preset: any;
  export type Preset = any;
  export const Visibility: any;
  export type Visibility = any;
}
