declare module "@/types" {
  // add real types later; placeholders keep the build green
  export type AdminScope = string;
  export type Notification = { id?: string; [k: string]: any };
  export type Order = { id?: string; [k: string]: any };
}

declare module "@/schemas/cache" {
  export const E_STALE_DATA: Error;
  export const E_SYNC_LAG: Error;
}
