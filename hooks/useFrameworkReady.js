import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { loadFonts } from '../utils/FontLoader';

// 在模块级别调用，防止自动隐藏启动屏（恢复之前工作的方式）
try {
  SplashScreen.preventAutoHideAsync();
} catch (error) {
  console.warn('[useFrameworkReady] SplashScreen.preventAutoHideAsync 不可用:', error.message);
}

export function useFrameworkReady() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('[useFrameworkReady] 开始准备应用...');
        
        // 使用多方案字体加载器
        const result = await loadFonts();
        
        console.log('[useFrameworkReady] 字体加载结果:', result);
        
        // 无论成功与否都继续，避免卡住
        setIsReady(true);
      } catch (error) {
        console.error('[useFrameworkReady] 准备过程出错:', error);
        // 即使出错也设置为ready
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (isReady) {
      console.log('[useFrameworkReady] 应用准备完成');
      
      // 隐藏启动屏
      try {
        SplashScreen.hideAsync();
      } catch (error) {
        console.warn('[useFrameworkReady] SplashScreen.hideAsync 错误:', error.message);
      }
      
      // 通知宿主APP（Mini App 环境）
      if (typeof window !== 'undefined' && window.frameworkReady) {
        console.log('[useFrameworkReady] 通知宿主APP ready');
        window.frameworkReady();
      }
    }
  }, [isReady]);

  return isReady;
}
