import { useCallback, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { Platform } from 'react-native';
import { randomBytes } from '@noble/hashes/utils';
import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha256';
import type { KycArtifactType } from '@/types';
import {
  trackKycCapturedPath,
  untrackKycCapturedPath,
} from '@/utils/kycTemp';

export type CaptureSource = 'camera' | 'library';

export interface CaptureArtifact {
  type: KycArtifactType;
  uri: string;
  mimeType?: string;
  name: string;
  capturedAt: number;
  nonce: string;
  size?: number;
  metadata?: Record<string, unknown>;
  durationMs?: number;
}

interface UseKycCaptureOptions {
  requireSocialProof?: boolean;
  requireWhatsapp?: boolean;
}

interface CaptureStep {
  key: 'id-front' | 'id-back' | 'selfie-with-id' | 'selfie-video' | 'social-proof' | 'review';
  title: string;
  description: string;
  required: boolean;
}

interface LivenessState {
  prompt: string;
  challenge: string;
  nonce: string;
}

const MAX_FILE_BYTES = 15 * 1024 * 1024;

function randomNonce(byteLength = 16): string {
  return Buffer.from(randomBytes(byteLength)).toString('hex');
}

function ensureSizeWithinLimit(size?: number): boolean {
  if (typeof size !== 'number') return true;
  return size <= MAX_FILE_BYTES;
}

function resolveFileName(type: KycArtifactType): string {
  const stamp = Date.now();
  switch (type) {
    case 'id-front':
      return `id-front-${stamp}.jpg`;
    case 'id-back':
      return `id-back-${stamp}.jpg`;
    case 'selfie-with-id':
      return `selfie-id-${stamp}.jpg`;
    case 'selfie-video':
      return `liveness-${stamp}.mp4`;
    case 'social-proof':
      return `social-${stamp}.jpg`;
    case 'whatsapp-call':
    default:
      return `artifact-${stamp}`;
  }
}

export function useKycCapture(options: UseKycCaptureOptions = {}) {
  const { requireSocialProof = false, requireWhatsapp = false } = options;
  const [artifacts, setArtifacts] = useState<CaptureArtifact[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [livenessState, setLivenessState] = useState<LivenessState | null>(null);

  const steps = useMemo<CaptureStep[]>(() => {
    const base: CaptureStep[] = [
      {
        key: 'id-front',
        title: 'צילום תעודה - צד קדמי',
        description: 'צלם/י את הצד הקדמי של התעודה בעזרת מצלמת הגב.',
        required: true,
      },
      {
        key: 'id-back',
        title: 'צילום תעודה - צד אחורי',
        description: 'צלם/י את הצד האחורי של התעודה.',
        required: true,
      },
      {
        key: 'selfie-with-id',
        title: 'סלפי עם התעודה',
        description: 'החזק/י את התעודה ליד הפנים וצור/י סלפי ברור.',
        required: true,
      },
      {
        key: 'selfie-video',
        title: 'וידאו בדיקת חיות',
        description: 'צלם/י וידאו קצר לפי ההוראות על המסך.',
        required: true,
      },
    ];
    if (requireSocialProof) {
      base.push({
        key: 'social-proof',
        title: 'צילום פרופיל רשת חברתית',
        description: 'העלה/י צילום מסך של פרופיל חברתי לפי הדרישות.',
        required: true,
      });
    }
    base.push({
      key: 'review',
      title: 'סקירה ושליחה',
      description: 'בדקו שהכל נראה טוב ושלחו לאדמין.',
      required: true,
    });
    return base;
  }, [requireSocialProof]);

  const currentStepIndex = useMemo(() => {
    const orderedKeys = steps.map((step) => step.key);
    for (let index = 0; index < orderedKeys.length; index += 1) {
      const key = orderedKeys[index];
      if (key === 'review') {
        return index;
      }
      const artifact = artifacts.find((item) => item.type === key);
      if (!artifact) {
        return index;
      }
    }
    return steps.length - 1;
  }, [artifacts, steps]);

  const setArtifact = useCallback((artifact: CaptureArtifact) => {
    setArtifacts((prev) => {
      const existing = prev.find((item) => item.type === artifact.type);
      if (existing) {
        if (existing.uri !== artifact.uri) {
          untrackKycCapturedPath(existing.uri);
        }
        return prev.map((item) => (item.type === artifact.type ? artifact : item));
      }
      return [...prev, artifact];
    });
    trackKycCapturedPath(artifact.uri);
  }, []);

  const removeArtifact = useCallback((type: KycArtifactType) => {
    setArtifacts((prev) => {
      const next = prev.filter((item) => item.type !== type);
      const removed = prev.find((item) => item.type === type);
      if (removed) {
        untrackKycCapturedPath(removed.uri);
      }
      return next;
    });
  }, []);

  const pickPhoto = useCallback(
    async (
      type: Extract<KycArtifactType, 'id-front' | 'id-back' | 'selfie-with-id' | 'social-proof'>,
      source: CaptureSource,
      cameraType: ImagePicker.CameraType = ImagePicker.CameraType.back,
      metadata: Record<string, unknown> = {},
    ): Promise<CaptureArtifact | null> => {
      if (Platform.OS !== 'web') {
        if (source === 'camera') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            throw new Error('camera-permission-denied');
          }
        } else {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            throw new Error('library-permission-denied');
          }
        }
      }

      const now = Date.now();
      const nonce = randomNonce();

      let picked: ImagePicker.ImagePickerAsset | null = null;
      if (source === 'camera') {
        const result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
          allowsEditing: true,
          cameraType,
        });
        if (result.canceled || !result.assets?.length) {
          return null;
        }
        picked = result.assets[0];
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          allowsEditing: true,
        });
        if (result.canceled || !result.assets?.length) {
          return null;
        }
        picked = result.assets[0];
      }

      if (!picked?.uri) {
        return null;
      }

      const size =
        typeof picked.fileSize === 'number'
          ? picked.fileSize
          : typeof picked.size === 'number'
          ? picked.size
          : undefined;
      if (!ensureSizeWithinLimit(size)) {
        throw new Error('file-too-large');
      }

      const mimeType = picked.mimeType || (picked as any).type;
      const name =
        picked.fileName || picked.name || `${resolveFileName(type)}.${mimeType?.split('/')?.[1] ?? 'jpg'}`;

      const artifact: CaptureArtifact = {
        type,
        uri: picked.uri,
        mimeType,
        name,
        capturedAt: now,
        nonce,
        size,
        metadata,
      };

      setArtifact(artifact);
      return artifact;
    },
    [setArtifact],
  );

  const prepareLiveness = useCallback((): LivenessState => {
    const promptOptions = [
      { prompt: 'המצמץ פעמיים', challenge: 'blink-twice' },
      { prompt: 'סובב/י את הראש לצד שמאל', challenge: 'turn-left' },
      { prompt: 'אמר/י את שם האפליקציה ואת התאריך', challenge: 'speak-phrase' },
    ];
    const chosen = promptOptions[Math.floor(Math.random() * promptOptions.length)];
    const nonce = randomNonce();
    const state: LivenessState = { ...chosen, nonce };
    setLivenessState(state);
    return state;
  }, []);

  const livenessVideoCapture = useCallback(
    async (camera: Camera): Promise<CaptureArtifact> => {
      if (!camera) {
        throw new Error('camera-not-ready');
      }
      const state = livenessState ?? prepareLiveness();
      const start = Date.now();
      const recording = await camera.recordAsync({
        maxDuration: 5,
        quality: Camera.Constants.VideoQuality['480p'],
        mute: false,
      });
      const durationMs = recording.durationMs ?? Date.now() - start;
      if (durationMs < 3000) {
        throw new Error('liveness-too-short');
      }
      const overlayHash = Buffer.from(sha256(Buffer.from(`${state.nonce}:${start}`))).toString('hex');
      const artifact: CaptureArtifact = {
        type: 'selfie-video',
        uri: recording.uri,
        mimeType: 'video/mp4',
        name: resolveFileName('selfie-video'),
        capturedAt: start,
        nonce: state.nonce,
        durationMs,
        metadata: {
          prompt: state.prompt,
          challenge: state.challenge,
          overlay: {
            nonce: state.nonce,
            ts: start,
            hash: overlayHash,
          },
        },
      };
      setArtifact(artifact);
      return artifact;
    },
    [livenessState, prepareLiveness, setArtifact],
  );

  const getArtifact = useCallback(
    (type: KycArtifactType) => artifacts.find((item) => item.type === type),
    [artifacts],
  );

  const reset = useCallback(() => {
    artifacts.forEach((artifact) => {
      untrackKycCapturedPath(artifact.uri);
    });
    setArtifacts([]);
    setWhatsappNumber('');
    setLivenessState(null);
  }, [artifacts]);

  const canSubmit = useMemo(() => {
    const requiredTypes: KycArtifactType[] = ['id-front', 'id-back', 'selfie-with-id', 'selfie-video'];
    if (requireSocialProof) {
      requiredTypes.push('social-proof');
    }
    const missing = requiredTypes.some((type) => !artifacts.find((item) => item.type === type));
    if (missing) return false;
    if (requireWhatsapp) {
      return whatsappNumber.trim().length >= 6;
    }
    return true;
  }, [artifacts, requireSocialProof, requireWhatsapp, whatsappNumber]);

  return {
    steps,
    currentStepIndex,
    artifacts,
    capturePhoto: pickPhoto,
    prepareLiveness,
    livenessState,
    livenessVideoCapture,
    removeArtifact,
    getArtifact,
    whatsappNumber,
    setWhatsappNumber,
    requireSocialProof,
    requireWhatsapp,
    canSubmit,
    reset,
  };
}

export type UseKycCaptureResult = ReturnType<typeof useKycCapture>;
