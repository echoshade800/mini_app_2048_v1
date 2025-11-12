import { useEffect } from 'react';
import FontLoader from '../utils/FontLoader';

export function useFrameworkReady() {
  useEffect(() => {
    // 在开发模式下记录字体状态,帮助调试
    if (__DEV__) {
      FontLoader.logFontStatus();
    }

    // 通知框架准备就绪
    if (typeof window !== 'undefined') {
      window.frameworkReady?.();
    }
  }, []);

  // 在宿主 APP 环境中,字体需要通过以下方式加载:
  // 1. 宿主 APP 在 Info.plist 中注册字体 (推荐)
  // 2. 字体文件位于 ios/rnbundle/fonts/*.ttf
  // 3. 详细配置请参考 ios/FONT_SETUP.md
  return true;
}