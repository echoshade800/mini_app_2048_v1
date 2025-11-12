import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { GameProvider } from '../contexts/GameContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const appIsReady = useFrameworkReady();

  // 在字体加载完成前不渲染任何内容
  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      {/* SafeAreaProvider 提供安全区上下文，让子组件可以正确获取安全区信息 */}
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