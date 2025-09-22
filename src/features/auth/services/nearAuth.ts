// @ts-nocheck
import {
  signIn,
  signOut,
  signMessage,
  useAccountId,
  getAccountId,
  getPublicKey,
  selector,
} from '@/services/walletSelector';

export { signIn, signOut, signMessage, useAccountId, getAccountId, getPublicKey, selector };

export default {
  signIn,
  signOut,
  signMessage,
  getAccountId,
  getPublicKey,
  selector,
};
