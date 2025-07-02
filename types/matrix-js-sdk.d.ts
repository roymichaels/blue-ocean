declare module 'matrix-js-sdk' {
  export const createClient: any;

  export interface MatrixClient {
    [key: string]: any;
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

  export type ClientEvent = any;
  export type RoomEvent = any;
  export type RoomMemberEvent = any;
  export type HttpApiEvent = any;
  export type SyncState = any;
  export type NotificationCountType = any;
  export type Preset = any;
  export type Visibility = any;
}
