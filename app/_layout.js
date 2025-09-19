import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { GameProvider } from '../contexts/GameContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <SafeAreaProvider>
      <GameProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="history" />
          <Stack.Screen name="details/[id]" />
          <Stack.Screen name="new-game" />
          <Stack.Screen name="about" />
          <Stack.Screen name="tutorial" />
          <Stack.Screen name="+not-found" />
        </Stack>
        {/* H5 适配：只在非 web 平台显示 StatusBar */}
        {Platform.OS !== 'web' && <StatusBar style="auto" />}
      </GameProvider>
    </SafeAreaProvider>
  );
}