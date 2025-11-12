import { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';

export function useFrameworkReady() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('📱 Starting font loading...');
        console.log('Ionicons.font:', Ionicons.font);
        
        // 防止自动隐藏启动屏
        try {
          await SplashScreen.preventAutoHideAsync();
          console.log('✅ SplashScreen prevented from hiding');
        } catch (splashError) {
          console.warn('⚠️ SplashScreen.preventAutoHideAsync error (可能在宿主APP中不可用):', splashError);
        }
        
        // 加载 Ionicons 字体
        console.log('🔄 Loading Ionicons font...');
        await Font.loadAsync({
          ...Ionicons.font,
        });
        
        console.log('✅ Fonts loaded successfully!');
        console.log('Loaded fonts:', Object.keys(Ionicons.font));
        setFontsLoaded(true);
      } catch (error) {
        console.error('❌ Error loading fonts:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        // 即使加载失败也设置为true，避免卡在启动屏幕
        setFontsLoaded(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      console.log('🎉 Fonts loaded, hiding splash screen...');
      
      // 字体加载完成后隐藏启动屏幕
      SplashScreen.hideAsync().catch(err => {
        console.warn('⚠️ SplashScreen.hideAsync error:', err);
      });
      
      // 通知框架准备好了 (宿主APP环境)
      if (typeof window !== 'undefined') {
        console.log('📢 Notifying framework ready...');
        window.frameworkReady?.();
      }
    }
  }, [fontsLoaded]);

  console.log('useFrameworkReady: fontsLoaded =', fontsLoaded);
  return fontsLoaded;
}