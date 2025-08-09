import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import TonWeb from 'tonweb';
import { Buffer } from 'buffer';
import storesAgent from '../agents/stores-agent';
import tonAuth from '../services/tonAuth';

const STORE_NFT_SOURCE = `import "@tact-lang/core";

message Transfer {
    to: Address;
}

contract StoreNFT {
    owner: Address;
    name: String;

    init(owner: Address, name: String) {
        self.owner = owner;
        self.name = name;
    }

    receive(msg: Transfer) {
        require(sender() == self.owner, 101);
        self.owner = msg.to;
    }

    getOwner(): Address {
        return self.owner;
    }

    getMetadata(): (String, Address) {
        return (self.name, self.owner);
    }
}`;

const provider = new TonWeb.HttpProvider('https://testnet.toncenter.com/api/v2/jsonRPC');

const StoreCreation: React.FC = () => {
  const [name, setName] = useState('');

  const deployStoreNFT = async (_storeName: string, owner: string) => {
    const res = await fetch('https://tact-lang.org/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources: { 'store-nft.tact': STORE_NFT_SOURCE } }),
    });
    if (!res.ok) throw new Error('Failed to compile store contract');
    const { contracts }: any = await res.json();
    const c = contracts['StoreNFT'];
    const code = TonWeb.boc.Cell.fromBoc(Buffer.from(c.codeBoc, 'base64'))[0];
    const data = TonWeb.boc.Cell.fromBoc(Buffer.from(c.dataBoc, 'base64'))[0];
    const contract = new (TonWeb as any).Contract(provider, { code, data });
    const init = await contract.createStateInit();
    const stateInitBoc = TonWeb.utils.bytesToBase64(await init.stateInit.toBoc({ idx: false }));
    await (tonAuth as any).tonConnectUI?.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 60,
      messages: [
        {
          address: c.address,
          amount: TonWeb.utils.toNano('0.05').toString(),
          stateInit: stateInitBoc,
        },
      ],
    });
    return c.address as string;
  };

  const mintStore = async () => {
    if (!name) return;
    const owner = tonAuth.getAddress();
    if (!owner) {
      await tonAuth.openModal();
      return;
    }
    const nftId = await deployStoreNFT(name, owner);
    const id = Date.now().toString();
    await storesAgent.add({ id, name, owner, nftId });
    setName('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Store Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <Button title="Mint Store" onPress={mintStore} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 16 },
  label: { fontSize: 16, fontWeight: '600', textAlign: 'right' },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, textAlign: 'right' },
});

export default StoreCreation;
