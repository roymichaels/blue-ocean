import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Upload, Camera, File as FileIcon } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import MediaService from '../services/media';
import DatabaseService from '../services/database';

interface ProofUploaderProps {
  jobId: string;
  proofUri?: string;
  onUploaded?: (uri: string) => void;
}

export default function ProofUploader({ jobId, proofUri, onUploaded }: ProofUploaderProps) {
  const [uri, setUri] = useState(proofUri);
  const [uploading, setUploading] = useState(false);
  const [pinataConfigured, setPinataConfigured] = useState(true);
  const { colors } = useTheme();

  useEffect(() => {
    MediaService.getInstance()
      .isPinataConfigured()
      .then(setPinataConfigured);
  }, []);

  const requestMediaPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'אנא אפשר גישה למדיה במכשיר.');
        return false;
      }
    }
    return true;
  };

  const ensureConfigured = async () => {
    const configured = await MediaService.getInstance().isPinataConfigured();
    setPinataConfigured(configured);
    if (!configured) {
      Alert.alert('Unavailable', 'Media uploads are not configured.');
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
      console.error('Error uploading proof:', error);
      Alert.alert('שגיאה', 'העלאת הקובץ נכשלה');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {uri ? (
        uri.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
          <Image source={{ uri }} style={styles.preview} />
        ) : (
          <View style={[styles.filePreview, { borderColor: colors.border.primary }]}> 
            <FileIcon size={24} color={colors.text.primary} />
            <Text style={{ color: colors.text.primary, marginTop: 4 }}>File</Text>
          </View>
        )
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, { borderColor: colors.gold }]}
            onPress={pickImage}
            disabled={uploading || !pinataConfigured}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.gold} />
            ) : (
              <>
                <Upload size={20} color={colors.gold} />
                <Text style={[styles.buttonText, { color: colors.gold }]}>Gallery</Text>
              </>
            )}
          </TouchableOpacity>
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={[styles.button, { borderColor: colors.gold }]}
              onPress={takePhoto}
              disabled={uploading || !pinataConfigured}
            >
              <Camera size={20} color={colors.gold} />
              <Text style={[styles.buttonText, { color: colors.gold }]}>Camera</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.button, { borderColor: colors.gold }]}
            onPress={pickDocument}
            disabled={uploading || !pinataConfigured}
          >
            <FileIcon size={20} color={colors.gold} />
            <Text style={[styles.buttonText, { color: colors.gold }]}>File</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    alignItems: 'flex-start'
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: 8
  },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600'
  },
  preview: {
    width: 100,
    height: 100,
    borderRadius: 8
  },
  filePreview: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
