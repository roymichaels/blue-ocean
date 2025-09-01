import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import pLimit from 'p-limit';
import { useTheme } from '@/contexts/ThemeContext';
import MediaService from '@/services/media';
import { Product } from '@/types';
import chain from '@/services/chain';

let setProductBatch: ((storeId: string, items: Product[]) => Promise<void>) | undefined;
let estimateSetProductBatch: ((items: Product[]) => number) | undefined;
if (chain === 'ton') {
  ({ setProductBatch, estimateSetProductBatch } = require('@/features/products/services/tonProducts'));
}

interface Summary {
  success: number;
  failed: number;
}

export async function processRecords(
  records: Product[],
  onProgress?: (percent: number) => void
): Promise<{ success: number; failed: number; gas: number[] }> {
  const limit = pLimit(5);
  const media = MediaService.getInstance();
  let completed = 0;
  const pinResults = await Promise.allSettled(
    records.map((rec, idx) =>
      limit(async () => {
        const pinnedImages = await Promise.all(
          (rec.images || []).map((img, i) => media.uploadMedia(img, `prod-${idx}-${i}`))
        );
        rec.images = pinnedImages;
        const dataUri = `data:application/json,${encodeURIComponent(JSON.stringify(rec))}`;
        await media.uploadMedia(dataUri, `prod-${idx}.json`);
        completed++;
        onProgress?.(Math.round((completed / records.length) * 100));
      })
    )
  );
  const success = pinResults.filter(r => r.status === 'fulfilled').length;
  const failed = pinResults.length - success;

  const BATCH_SIZE = 25;
  const gasEstimates: number[] = [];
  if (!estimateSetProductBatch || !setProductBatch) {
    return { success, failed, gas: gasEstimates };
  }
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const g = await estimateSetProductBatch(batch);
    gasEstimates.push(g);
    if (batch[0]?.storeId) {
      await setProductBatch(batch[0].storeId, batch);
    }
  }
  return { success, failed, gas: gasEstimates };
}

export default function BulkProductUploader() {
  const { colors } = useTheme();
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [gas, setGas] = useState<number[]>([]);

  const handleSelectFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'application/json'],
    });
    if (res.canceled) return;
    const file = res.assets[0];
    const content = await (await fetch(file.uri)).text();
    let records: Product[] = [];
    try {
      if (file.mimeType?.includes('json') || file.name.endsWith('.json')) {
        records = parseJson(content);
      } else {
        records = parseCsv(content);
      }
    } catch (e) {
      setSummary({ success: 0, failed: 0 });
      return;
    }
    setProcessing(true);
    setProgress(0);
    const { success, failed, gas: gasEstimates } = await processRecords(records, setProgress);
    setSummary({ success, failed });
    setGas(gasEstimates);
    setProcessing(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleSelectFile}
      >
        <Text style={{ color: colors.text.inverse }}>Select CSV/JSON File</Text>
      </TouchableOpacity>
      {processing && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={{
                backgroundColor: colors.primary,
                width: `${progress}%`,
                height: '100%',
              }}
            />
          </View>
          <Text style={{ color: colors.text.primary }}>{progress}%</Text>
        </View>
      )}
      {summary && (
        <View style={styles.summary}>
          <Text style={{ color: colors.text.primary }}>Success: {summary.success}</Text>
          <Text style={{ color: colors.text.primary }}>Failed: {summary.failed}</Text>
          {gas.map((g, i) => (
            <Text key={i} style={{ color: colors.text.secondary }}>
              Batch {i + 1} gas: {g}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function parseJson(text: string): Product[] {
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : [data];
}

function parseCsv(text: string): Product[] {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift()!.split(',').map(h => h.trim());
  return lines.map(line => {
    const values = line.split(',').map(v => v.trim());
    const rec: any = {};
    headers.forEach((h, i) => {
      rec[h] = values[i];
    });
    rec.price = Number(rec.price);
    rec.rating = Number(rec.rating);
    rec.reviews = Number(rec.reviews);
    rec.stock = Number(rec.stock);
    rec.images = rec.images ? rec.images.split('|').map((s: string) => s.trim()) : [];
    return rec as Product;
  });
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  progressContainer: {
    marginVertical: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  summary: {
    marginTop: 16,
  },
});

export { parseJson, parseCsv };
