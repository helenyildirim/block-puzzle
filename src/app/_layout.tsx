import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';
import { AppProvider } from '../state/AppContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { colors } from '../theme';

// Yazı tipleri yüklenene kadar sistemin açılış ekranı görünsün
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });
  const fontsDone = loaded || !!error;

  useEffect(() => {
    if (fontsDone) SplashScreen.hide();
  }, [fontsDone]);

  if (!fontsDone) return null;

  return (
    <ErrorBoundary>
      <AppProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: { backgroundColor: colors.bgBottom },
          }}
        >
          <Stack.Screen name="game" options={{ gestureEnabled: false }} />
        </Stack>
      </AppProvider>
    </ErrorBoundary>
  );
}
