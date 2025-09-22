import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { View } from 'react-native';
import {
  StoreCreationContent,
  type MintResult,
  type StoreIdentityForm,
  type MintProgressState,
} from './StoreCreation';
import { ThemeProvider, LanguageProvider } from '@/ui/ThemeProvider';

const meta: Meta<typeof StoreCreationContent> = {
  title: 'Stores/Store Creation Wizard',
  component: StoreCreationContent,
  decorators: [
    Story => (
      <ThemeProvider>
        <LanguageProvider>
          <View style={{ flex: 1, backgroundColor: '#0E0D0A', padding: 24 }}>
            <Story />
          </View>
        </LanguageProvider>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof StoreCreationContent>;

const mockMint: Story['args']['onMint'] = async (
  values: StoreIdentityForm,
  updateProgress: (state: MintProgressState) => void,
) => {
  updateProgress({ status: 'submitting' });
  updateProgress({ status: 'finalizing', txHash: 'near:mock-hash' });
  const result: MintResult = {
    storeId: 'mock-store',
    storeName: values.name.trim() || 'Aurora Market',
    owner: values.owner,
    txHash: 'near:mock-hash',
  };
  updateProgress({ status: 'success', txHash: result.txHash });
  return result;
};

export const Identity: Story = {
  name: 'Step 1 – Identity',
  args: {
    owner: 'owner.testnet',
    onConnectWallet: async () => {},
    onMint: mockMint,
    onViewAdmin: () => {},
    initialValues: { owner: 'owner.testnet', name: '' },
  },
};

export const Confirmation: Story = {
  name: 'Step 2 – Confirmation',
  args: {
    ...Identity.args,
    initialStep: 'confirmation',
    initialValues: { owner: 'owner.testnet', name: 'Aurora Market' },
  },
};

export const Success: Story = {
  name: 'Step 3 – Success',
  args: {
    ...Identity.args,
    initialStep: 'success',
    initialMintResult: {
      storeId: 'mock-store',
      storeName: 'Aurora Market',
      owner: 'owner.testnet',
      txHash: 'near:mock-hash',
    },
  },
};

