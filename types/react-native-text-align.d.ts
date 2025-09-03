import 'react-native';

declare module 'react-native' {
  interface TextStyle {
    textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify' | 'start' | 'end';
  }

  interface TextInputProps {
    textAlign?: 'left' | 'right' | 'center' | 'start' | 'end';
  }
}

export {};
