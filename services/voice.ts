import { Platform } from 'react-native';

export interface SpeakOptions {
  onStart?: () => void;
  onDone?: () => void;
  onAmplitude?: (value: number) => void;
}

class VoiceService {
  private static instance: VoiceService;
  private amplitudeInterval?: NodeJS.Timeout;

  private constructor() {}

  static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  private clearAmplitude(onAmplitude?: (value: number) => void) {
    if (this.amplitudeInterval) {
      clearInterval(this.amplitudeInterval);
      this.amplitudeInterval = undefined;
    }
    if (onAmplitude) {
      onAmplitude(0);
    }
  }

  async speak(text: string, options: SpeakOptions = {}): Promise<void> {
    const { onStart, onDone, onAmplitude } = options;

    if (!text) {
      return;
    }

    return new Promise<void>(async (resolve) => {
      const startAmplitude = () => {
        if (onAmplitude) {
          this.clearAmplitude();
          this.amplitudeInterval = setInterval(() => {
            onAmplitude(Math.random());
          }, 100);
        }
      };

      const finish = () => {
        this.clearAmplitude(onAmplitude);
        onDone && onDone();
        resolve();
      };

      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utter = new SpeechSynthesisUtterance(text);
          utter.onstart = () => {
            onStart && onStart();
            startAmplitude();
          };
          utter.onend = finish;
          utter.onerror = finish;
          window.speechSynthesis.speak(utter);
        } else {
          let Speech: any;
          try {
            Speech = require('expo-speech');
          } catch {
            Speech = null;
          }

          if (Speech && Speech.speak) {
            onStart && onStart();
            startAmplitude();
            Speech.speak(text, {
              onDone: finish,
              onStopped: finish,
              onError: finish,
            });
          } else {
            console.warn('Speech synthesis not available');
            finish();
          }
        }
      } catch (e) {
        console.warn('Speech synthesis error', e);
        finish();
      }
    });
  }

  stop() {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      } else {
        const Speech = require('expo-speech');
        Speech.stop();
      }
    } catch {
      // ignore
    } finally {
      this.clearAmplitude();
    }
  }
}

export default VoiceService;

