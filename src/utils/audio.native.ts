import {
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
  PLAYBACK_STATUS_UPDATE,
  AudioModule,
} from 'expo-audio';

export { 
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
  PLAYBACK_STATUS_UPDATE,
};

// Constructor class for creating a recorder instance
export const AudioRecorderConstructor = AudioModule.AudioRecorder;

