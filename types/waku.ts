export interface WakuMessage<T = any> {
  type: string;
  payload: T;
  sender: {
    publicKey: string;
    role?: string;
  };
  signature: string;
}
