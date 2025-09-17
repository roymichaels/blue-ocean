import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { Spinner } from '@/ui/primitives';
import WatermarkOverlay from './WatermarkOverlay';
import type { CaptureArtifact } from '../hooks/useKycCapture';

interface VideoCaptureProps {
  appName: string;
  livenessPrompt: string | null;
  livenessNonce: string | null;
  prepareLiveness: () => { prompt: string; challenge: string; nonce: string };
  recordLiveness: (camera: Camera) => Promise<CaptureArtifact>;
  onRecorded: (artifact: CaptureArtifact) => void;
  onCancel?: () => void;
}

export default function VideoCapture({
  appName,
  livenessPrompt,
  livenessNonce,
  prepareLiveness,
  recordLiveness,
  onRecorded,
  onCancel,
}: VideoCaptureProps): React.ReactElement {
  const cameraRef = useRef<Camera | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionTs, setSessionTs] = useState(() => Date.now());
  const [promptState, setPromptState] = useState(() =>
    livenessPrompt && livenessNonce ? { prompt: livenessPrompt, nonce: livenessNonce } : null,
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (mounted) {
        setHasPermission(status === 'granted');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current) {
      setError('מצלמה אינה זמינה');
      return;
    }
    setError(null);
    const state = promptState ?? prepareLiveness();
    setPromptState({ prompt: state.prompt, nonce: state.nonce });
    setSessionTs(Date.now());
    try {
      setRecording(true);
      const artifact = await recordLiveness(cameraRef.current);
      onRecorded(artifact);
    } catch (err) {
      if (err instanceof Error && err.message === 'liveness-too-short') {
        setError('הוידאו חייב להיות לפחות 3 שניות. נסה/י שוב עם ההנחיות.');
      } else {
        setError('לא ניתן להקליט את הוידאו. נסה/י שוב.');
      }
    } finally {
      setRecording(false);
    }
  }, [onRecorded, prepareLiveness, promptState, recordLiveness]);

  const overlayNonce = promptState?.nonce ?? livenessNonce ?? '';
  const overlayPrompt = promptState?.prompt ?? livenessPrompt ?? '';

  const permissionDenied = useMemo(() => hasPermission === false, [hasPermission]);

  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <Spinner />
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>יש לאשר גישה למצלמה לצורך בדיקת חיות.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setHasPermission(null)}>
          <Text style={styles.retryLabel}>נסה/י שוב</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={(ref) => {
          cameraRef.current = ref;
        }}
        style={styles.camera}
        type={CameraType.front}
        ratio="16:9"
      >
        <WatermarkOverlay appName={appName} timestamp={sessionTs} nonce={overlayNonce} />
        <View style={styles.promptContainer} pointerEvents="none">
          <Text style={styles.prompt}>{overlayPrompt}</Text>
        </View>
      </Camera>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        {onCancel ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={onCancel} disabled={recording}>
            <Text style={styles.secondaryLabel}>ביטול</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.primaryButton, recording && styles.primaryButtonDisabled]}
          onPress={() => void startRecording()}
          disabled={recording}
        >
          <Text style={styles.primaryLabel}>{recording ? 'מקליט…' : 'התחל/י הקלטה'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', height: 320, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  camera: { flex: 1 },
  promptContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  prompt: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#1f2937',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryLabel: { color: '#fff', fontWeight: '600', fontSize: 16 },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginRight: 12,
  },
  secondaryLabel: { color: '#1f2937', fontWeight: '600' },
  error: { color: '#ef4444', marginTop: 8, textAlign: 'center' },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  permissionText: { textAlign: 'center', marginBottom: 16 },
  retryButton: {
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryLabel: { color: '#1f2937', fontWeight: '600' },
});
