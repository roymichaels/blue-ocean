import { TonConnectUI } from '@tonconnect/ui';
import {
  useTonWallet as useTCWallet,
  useTonAddress as useTCAddress,
  useTonConnectUI,
} from '@tonconnect/ui-react';
import { useEffect } from 'react';

let tonConnect: TonConnectUI | null = null;

export const useTonWallet = useTCWallet;
export const useTonAddress = useTCAddress;

export const useTonConnect = () => {
  const { tonConnectUI } = useTonConnectUI();
  useEffect(() => {
    tonConnect = tonConnectUI;
  }, [tonConnectUI]);
  return tonConnectUI;
};

export const getTonConnect = () => tonConnect;

export const requestSignature = async (
  payload: any,
): Promise<string | null> => {
  if (!tonConnect) return null;
  const result = await tonConnect.signData(payload);
  return result.signature;
};

export const openModal = async (): Promise<void> => {
  if (!tonConnect) return;
  await tonConnect.openModal();
};

export const getTonPublicKey = (): string | null =>
  tonConnect?.account?.publicKey ?? null;

export const getAddress = (): string | null =>
  tonConnect?.account?.address ?? null;

export default {
  getTonConnect,
  requestSignature,
  openModal,
  getTonPublicKey,
  getAddress,
};
