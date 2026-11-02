import { useState } from 'react';
import { Animated } from 'react-native';

/** Bir kez oluşturulan Animated.Value (react-native-web'de yerleşik useAnimatedValue yok, o yüzden kendi sürümümüz). */
export function useAnimatedValue(initial: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}
