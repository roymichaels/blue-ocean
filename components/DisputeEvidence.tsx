import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { t } from '@/services/i18n';

interface Props {
  uri?: string;
}

export default function DisputeEvidence({ uri }: Props) {
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchEvidence() {
      if (!uri) return;
      try {
        const cid = uri.replace(/^ipfs:\/\//, '');
        const res = await fetch(`https://ipfs.io/ipfs/${cid}`);
        const text = await res.text();
        if (!cancelled) setContent(text);
      } catch {
        if (!cancelled) setContent(null);
      }
    }
    fetchEvidence();
    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (!uri) return <Text>{t('disputes.noEvidence')}</Text>;
  if (content == null) return <Text>{t('disputes.loadingEvidence')}</Text>;
  return (
    <View>
      <Text selectable>{content}</Text>
    </View>
  );
}
