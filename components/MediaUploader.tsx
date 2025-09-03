import { errorLog } from '@/utils/logger';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import SmartImage from './SmartImage';
import { Camera, Upload, X, Play, Video } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import MediaService from '../services/media';

interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  name?: string;
  thumbnail?: string;
  file?: File | Blob; // For new uploads
}

interface MediaUploaderProps {
  media: MediaItem[];
  onMediaChange: (media: MediaItem[]) => void;
  maxFiles?: number;
  allowVideos?: boolean;
  style?: any;
}

export default function MediaUploader({
  media = [],
  onMediaChange,
  maxFiles = 6,
  allowVideos = true,
  style
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [thumbnailMap, setThumbnailMap] = useState<Record<string, string>>({});
  const [pinataConfigured, setPinataConfigured] = useState(true);
  const { colors } = useTheme();

  useEffect(() => {
    MediaService.getInstance()
      .isPinataConfigured()
      .then(setPinataConfigured);

    const loadThumbnails = async () => {
      const svc = MediaService.getInstance();
      for (const item of media) {
        if (item.type === 'video' && !thumbnailMap[item.id]) {
          try {
            const thumb = await svc.generateVideoThumbnail(item.uri);
            if (thumb) {
              setThumbnailMap(prev => ({ ...prev, [item.id]: thumb }));
            }
          } catch (err) {
            errorLog('Error loading thumbnail:', err);
          }
        }
      }
    };
    loadThumbnails();
  }, [media]);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload media!');
        return false;
      }
    }
    return true;
  };

  const handleUpload = async (pickerResult: ImagePicker.ImagePickerResult) => {
    if (pickerResult.canceled || pickerResult.assets.length === 0) {
      return;
    }

    setUploading(true);
    try {
      const mediaService = MediaService.getInstance();
      let currentMedia = [...media];

      for (const asset of pickerResult.assets) {
        if (currentMedia.length >= maxFiles) break;

        const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        const placeholder: MediaItem = {
          id,
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          name: asset.fileName || `media_${Date.now()}`,
        };

        if (placeholder.type === 'video') {
          try {
            const thumb = await mediaService.generateVideoThumbnail(asset.uri);
            if (thumb) {
              setThumbnailMap((m) => ({ ...m, [id]: thumb }));
            }
          } catch (err) {
            errorLog('Error generating thumbnail:', err);
          }
        }

        currentMedia = [...currentMedia, placeholder];
        onMediaChange(currentMedia);
        setProgressMap((p) => ({ ...p, [id]: 0 }));

        const uploadedUri = await mediaService.uploadMedia(
          asset.uri,
          asset.fileName || `media_${Date.now()}`,
          (percent) => {
            setProgressMap((p) => ({ ...p, [id]: percent }));
          }
        );

        currentMedia = currentMedia.map((item) =>
          item.id === id ? { ...item, uri: uploadedUri } : item
        );
        onMediaChange(currentMedia);

        setProgressMap((p) => {
          const { [id]: _removed, ...rest } = p;
          return rest;
        });
      }
    } catch (error) {
      errorLog('Error handling upload:', error);
      Alert.alert('Error', 'Failed to upload media. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const pickMedia = async () => {
    const configured = await MediaService.getInstance().isPinataConfigured();
    setPinataConfigured(configured);
    if (!configured) {
      Alert.alert('Unavailable', 'Media uploads are not configured.');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (media.length >= maxFiles) {
      Alert.alert('Limit Reached', `You can only upload up to ${maxFiles} files.`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: allowVideos
          ? ImagePicker.MediaTypeOptions.All
          : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [16, 9],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: maxFiles - media.length,
      });

      await handleUpload(result);
    } catch (error) {
      errorLog('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media. Please try again.');
    }
  };

  const takePhoto = async () => {
    const configured = await MediaService.getInstance().isPinataConfigured();
    setPinataConfigured(configured);
    if (!configured) {
      Alert.alert('Unavailable', 'Media uploads are not configured.');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (media.length >= maxFiles) {
      Alert.alert('Limit Reached', `You can only upload up to ${maxFiles} files.`);
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      await handleUpload(result);
    } catch (error) {
      errorLog('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const removeMedia = (id: string) => {
    onMediaChange(media.filter(item => item.id !== id));
    setThumbnailMap((prev) => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const renderMediaItem = (item: MediaItem, index: number) => (
    <View key={item.id} style={styles.mediaItem}>
      <View style={[styles.mediaContainer, {
        backgroundColor: colors.surface.primary,
        borderColor: colors.border.primary
      }]}>
        {item.type === 'video' ? (
          <View style={styles.videoContainer}>
            <SmartImage uri={thumbnailMap[item.id] || item.uri} width={100} height={100} contentFit="cover" />
            <View pointerEvents="none" style={styles.playOverlay}>
              <Play size={24} color={colors.text.inverse} fill={colors.text.inverse} />
            </View>
            <View pointerEvents="none" style={styles.videoIndicator}>
              <Video size={12} color={colors.text.inverse} />
            </View>
          </View>
        ) : (
          <SmartImage uri={item.uri} width={100} height={100} contentFit="cover" />
        )}
        
        <TouchableOpacity
          style={[styles.removeButton, { backgroundColor: colors.status.error }]}
          onPress={() => removeMedia(item.id)}
        >
          <X size={16} color={colors.text.inverse} />
        </TouchableOpacity>
        
        {progressMap[item.id] !== undefined && (
          <View style={styles.progressWrapper}>
            <View
              style={[
                styles.progressBar,
                { width: `${progressMap[item.id]}%`, backgroundColor: colors.gold },
              ]}
            />
            <Text style={[styles.progressText, { color: colors.text.inverse }]}>
              {progressMap[item.id]}%
            </Text>
          </View>
        )}

        {index === 0 && (
          <View style={[styles.primaryBadge, { backgroundColor: colors.gold }]}>
            <Text style={[styles.primaryBadgeText, { color: colors.text.inverse }]}>Primary</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, { color: colors.text.primary }]}>Media Files ({media.length}/{maxFiles})</Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.mediaList}
      >
        {media.map(renderMediaItem)}
        
        {media.length < maxFiles && (
          <View style={styles.uploaderActions}>
            <TouchableOpacity
              style={[styles.uploadButton, { 
                backgroundColor: colors.surface.primary,
                borderColor: colors.gold 
              }]}
              onPress={pickMedia}
              disabled={uploading || !pinataConfigured}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.gold} />
              ) : (
                <>
                  <Upload size={20} color={colors.gold} />
                  <Text style={[styles.uploadButtonText, { color: colors.gold }]}>
                    Gallery
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={[styles.uploadButton, { 
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.gold 
                }]}
                onPress={takePhoto}
                disabled={uploading || !pinataConfigured}
              >
                <Camera size={20} color={colors.gold} />
                <Text style={[styles.uploadButtonText, { color: colors.gold }]}>Camera</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
      
      <Text style={[styles.helperText, { color: colors.text.secondary }]}>
        {allowVideos 
          ? 'Upload up to 6 images and videos at once. First item will be the primary media.'
          : 'Upload up to 6 images at once. First item will be the primary image.'
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'right',
  },
  mediaList: {
    paddingRight: 16,
    minHeight: 120,
  },
  mediaItem: {
    marginLeft: 12,
  },
  mediaContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    start: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    top: 4,
    end: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 4,
    padding: 2,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    start: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressWrapper: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    height: '100%',
  },
  progressText: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '600',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 4,
    start: 4,
    end: 4,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  uploaderActions: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    gap: 8,
  },
  uploadButton: {
    width: 100,
    height: 45,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  uploadButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
    lineHeight: 16,
  },
});
