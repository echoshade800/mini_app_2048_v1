import { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';

// 保持启动屏幕显示,直到字体加载完成
SplashScreen.preventAutoHideAsync();

export function useFrameworkReady() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        // 加载 Ionicons 字体
        await Font.loadAsync({
          ...Ionicons.font,
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        // 即使加载失败也设置为true，避免卡在启动屏幕
        setFontsLoaded(true);
      }
    }

    loadFonts();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      // 字体加载完成后隐藏启动屏幕
      SplashScreen.hideAsync();
      
      // 通知框架准备好了 (宿主APP环境)
      if (typeof window !== 'undefined') {
        window.frameworkReady?.();
      }
    }
  }, [fontsLoaded]);

  return fontsLoaded;
}