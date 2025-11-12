import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useFrameworkReady } from '../hooks/useFrameworkReady';
import { GameProvider } from '../contexts/GameContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const fontsLoaded = useFrameworkReady();

  // 在字体加载完成之前显示加载屏幕
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf8ef',
  },
  loadingText: {
    fontSize: 18,
    color: '#776e65',
    fontWeight: '600',
  },
});