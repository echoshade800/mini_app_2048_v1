import { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';

// 防止自动隐藏启动屏
SplashScreen.preventAutoHideAsync();

export function useFrameworkReady() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // 预加载字体
        await Font.loadAsync({
          ...Ionicons.font,
        });
      } catch (e) {
        console.warn('Error loading fonts:', e);
      } finally {
        // 告诉应用准备好了
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      // 隐藏启动屏
      SplashScreen.hideAsync();
      
      // 通知框架准备就绪
      if (typeof window !== 'undefined') {
        window.frameworkReady?.();
      }
    }
  }, [appIsReady]);

  return appIsReady;
}