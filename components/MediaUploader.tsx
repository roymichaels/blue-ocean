import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Camera, Upload, X, Play, Video } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import MediaService from '../services/media';

interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  name?: string;
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
  const { colors } = useTheme();

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
      const newMediaItems: MediaItem[] = [];

      for (const asset of pickerResult.assets) {
        const uploadedUri = await mediaService.uploadMedia(
          asset.uri,
          asset.fileName || `media_${Date.now()}`
        );

        newMediaItems.push({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          uri: uploadedUri,
          type: asset.type === 'video' ? 'video' : 'image',
          name: asset.fileName || `media_${Date.now()}`
        });
      }

      // Make sure we don't exceed maxFiles
      const combinedMedia = [...media, ...newMediaItems].slice(0, maxFiles);
      onMediaChange(combinedMedia);
    } catch (error) {
      console.error('Error handling upload:', error);
      Alert.alert('Error', 'Failed to upload media. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const pickMedia = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (media.length >= maxFiles) {
      Alert.alert('Limit Reached', `You can only upload up to ${maxFiles} files.`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: allowVideos ? ImagePicker.MediaTypeOptions.All : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [16, 9],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: maxFiles - media.length,
      });

      await handleUpload(result);
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media. Please try again.');
    }
  };

  const takePhoto = async () => {
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
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const removeMedia = (id: string) => {
    onMediaChange(media.filter(item => item.id !== id));
  };

  const renderMediaItem = (item: MediaItem, index: number) => (
    <View key={item.id} style={styles.mediaItem}>
      <View style={[styles.mediaContainer, { 
        backgroundColor: colors.surface.primary,
        borderColor: colors.border.primary 
      }]}>
        {item.type === 'video' ? (
          <View style={styles.videoContainer}>
            <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} />
            <View style={styles.playOverlay}>
              <Play size={24} color={colors.text.inverse} fill={colors.text.inverse} />
            </View>
            <View style={styles.videoIndicator}>
              <Video size={12} color={colors.text.inverse} />
            </View>
          </View>
        ) : (
          <Image source={{ uri: item.uri }} style={styles.mediaThumbnail} />
        )}
        
        <TouchableOpacity
          style={[styles.removeButton, { backgroundColor: colors.status.error }]}
          onPress={() => removeMedia(item.id)}
        >
          <X size={16} color={colors.text.inverse} />
        </TouchableOpacity>
        
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
              disabled={uploading}
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
                disabled={uploading}
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
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    padding: 2,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
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