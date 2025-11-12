import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { loadFonts } from '../utils/FontLoader';

// 在模块级别调用，防止自动隐藏启动屏（恢复之前工作的方式）
try {
  SplashScreen.preventAutoHideAsync();
} catch (error) {
  // SplashScreen 在某些环境可能不可用，忽略错误
}

export function useFrameworkReady() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // 使用多方案字体加载器
        await loadFonts();
        setIsReady(true);
      } catch (error) {
        console.error('Font loading error:', error);
        // 即使出错也设置为ready，确保应用能正常启动
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (isReady) {
      // 隐藏启动屏
      try {
        SplashScreen.hideAsync();
      } catch (error) {
        // 忽略 SplashScreen 错误
      }
      
      // 通知宿主APP（Mini App 环境）
      if (typeof window !== 'undefined' && window.frameworkReady) {
        window.frameworkReady();
      }
    }
  }, [isReady]);

  return isReady;
}
