// Web shims to avoid importing expo-audio on web builds

export const PLAYBACK_STATUS_UPDATE = 'playbackStatusUpdate';

export const createAudioPlayer = (_source?: any) => {
  const listeners: Record<string, Array<(arg: any) => void>> = {};
  return {
    play() {},
    pause() {},
    addListener(event: string, cb: (arg: any) => void) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
      return { remove: () => {} } as any;
    },
    remove() {},
  } as any;
};

export const requestRecordingPermissionsAsync = async () => ({ status: 'denied' } as any);
export const setAudioModeAsync = async (_mode: any) => {};
export const RecordingPresets: any = { HIGH_QUALITY: {} };

export class AudioRecorderConstructor {
  uri: string | null = null;
  constructor(_options?: any) {}
  record() {}
  async stop() {}
  remove() {}
}

