import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import SmartImage from './SmartImage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Upload, Camera, File as FileIcon } from 'lucide-react-native';
import { useTheme } from '@/ui/ThemeProvider';
import MediaService from '@/services/media';
import DatabaseService from '@/services/database';
import { Card, Stack } from '@/ui';
import { spacing, colors as tokenColors } from '@/ui/tokens';
import { Spinner } from '@/ui/primitives';
import { useLanguage } from '@/ui/ThemeProvider';

interface ProofUploaderProps {
  jobId: string;
  proofUri?: string;
  onUploaded?: (uri: string) => void;
}

function useUploaderColors() {
  const { colors } = useTheme();
  return {
    border: colors.border.primary || tokenColors.border.primary,
    text: colors.text.primary || tokenColors.text.primary,
    gold: colors.gold || tokenColors.gold,
  };
}

export default function ProofUploader({ jobId, proofUri, onUploaded }: ProofUploaderProps) {
  const [uri, setUri] = useState(proofUri);
  const [uploading, setUploading] = useState(false);
  const [pinataConfigured, setPinataConfigured] = useState(true);
  const theme = useUploaderColors();
  const { t } = useLanguage();

  useEffect(() => {
    MediaService.getInstance()
      .isPinataConfigured()
      .then(setPinataConfigured);
  }, []);

  const requestMediaPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('proofUploader.permissionRequired'),
          t('proofUploader.permissionMessage')
        );
        return false;
      }
    }
    return true;
  };

  const ensureConfigured = async () => {
    const configured = await MediaService.getInstance().isPinataConfigured();
    setPinataConfigured(configured);
    if (!configured) {
      Alert.alert(
        t('proofUploader.unavailableTitle'),
        t('proofUploader.unavailableMessage')
      );
    }
    return configured;
  };

    const pickDocument = async () => {
      if (!(await ensureConfigured())) return;
      if (!(await requestMediaPermission())) return;
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      await uploadFile(asset.uri, asset.name || `proof_${Date.now()}`);
    };

  const pickImage = async () => {
    if (!(await ensureConfigured())) return;
    if (!(await requestMediaPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    await uploadFile(asset.uri, asset.fileName || `proof_${Date.now()}`);
  };

  const takePhoto = async () => {
    if (!(await ensureConfigured())) return;
    if (!(await requestMediaPermission())) return;
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    await uploadFile(asset.uri, asset.fileName || `proof_${Date.now()}`);
  };

  const uploadFile = async (fileUri: string, name: string) => {
    try {
      setUploading(true);
      const mediaService = MediaService.getInstance();
      const uploaded = await mediaService.uploadMedia(fileUri, name);
      const db = DatabaseService.getInstance();
      await db.updateDeliveryJobProof(jobId, uploaded);
      setUri(uploaded);
      onUploaded?.(uploaded);
    } catch (error) {
      errorLog(t('proofUploader.errorLog'), error);
      Alert.alert(t('proofUploader.errorTitle'), t('proofUploader.errorMessage'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card style={styles.container}>
      {uri ? (
        uri.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
          <SmartImage
            uri={uri}
            width={100}
            height={100}
            style={styles.preview}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.filePreview, { borderColor: theme.border }]}>
            <FileIcon size={24} color={theme.text} />
            <Text style={[styles.fileLabel, { color: theme.text }]}>
              {t('proofUploader.file')}
            </Text>
          </View>
        )
      ) : (
        <Stack direction="horizontal" gap="spacer8">
          <TouchableOpacity
            style={[styles.button, { borderColor: theme.gold }]}
            onPress={pickImage}
            disabled={uploading || !pinataConfigured}
          >
            {uploading ? (
              <Spinner size="small" color={theme.gold} />
            ) : (
              <>
                <Upload size={20} color={theme.gold} />
                <Text style={[styles.buttonText, { color: theme.gold }]}>
                  {t('proofUploader.gallery')}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={[styles.button, { borderColor: theme.gold }]}
              onPress={takePhoto}
              disabled={uploading || !pinataConfigured}
            >
              <Camera size={20} color={theme.gold} />
              <Text style={[styles.buttonText, { color: theme.gold }]}>
                {t('proofUploader.camera')}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.button, { borderColor: theme.gold }]}
            onPress={pickDocument}
            disabled={uploading || !pinataConfigured}
          >
            <FileIcon size={20} color={theme.gold} />
            <Text style={[styles.buttonText, { color: theme.gold }]}>
              {t('proofUploader.file')}
            </Text>
          </TouchableOpacity>
        </Stack>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.spacer8,
    alignItems: 'flex-start',
  },
  button: {
    borderWidth: 1,
    borderRadius: spacing.spacer8,
    paddingVertical: spacing.spacer4,
    paddingHorizontal: spacing.spacer12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.spacer4,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  preview: {
    borderRadius: spacing.spacer8,
  },
  filePreview: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderRadius: spacing.spacer8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileLabel: {
    marginTop: spacing.spacer4,
  },
});
