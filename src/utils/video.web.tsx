import React from 'react';
import { View } from 'react-native';

export const VideoView = ({ style }: any) => <View style={style} />;

export function createVideoPlayer(_source?: any) {
  return {
    play() {},
    remove() {},
  } as any;
}

export type VideoPlayer = any;

