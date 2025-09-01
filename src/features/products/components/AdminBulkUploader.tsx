import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@/contexts/ThemeContext';
import { Product } from '@/types';
import { parseJson, parseCsv, processRecords } from './BulkProductUploader';

interface Summary {
  success: number;
  failed: number;
}

export default function AdminBulkUploader() {
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
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleSelectFile}>
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

