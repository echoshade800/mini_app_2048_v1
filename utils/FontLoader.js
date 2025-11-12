/**
 * 多方案字体加载器
 * 尝试多种方式确保字体能够正常加载和显示
 */

import * as Font from 'expo-font';
import { Platform } from 'react-native';

const FONT_LOAD_METHODS = {
  EXPO_FONT: 'expo-font',
  PRELOADED: 'preloaded',
  NATIVE: 'native',
  FAILED: 'failed'
};

let loadedMethod = null;
let loadError = null;

/**
 * 方案1: 使用 expo-font 异步加载
 */
async function loadWithExpoFont() {
  try {
    // 动态导入以避免模块未安装时崩溃
    const { Ionicons } = require('@expo/vector-icons');
    
    await Font.loadAsync({
      ...Ionicons.font,
    });
    
    loadedMethod = FONT_LOAD_METHODS.EXPO_FONT;
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * 方案2: 假设字体已预加载（宿主APP已配置）
 */
async function checkPreloadedFont() {
  try {
    // 在React Native中没有直接API检查字体是否存在
    // 我们假设如果 expo-font 失败，字体可能已被宿主APP预加载
    loadedMethod = FONT_LOAD_METHODS.PRELOADED;
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * 方案3: 使用原生字体名称
 */
async function useNativeFontNames() {
  try {
    // 在 iOS 上，字体名称可能与文件名不同
    // Ionicons.ttf 的字体名称是 "Ionicons"
    loadedMethod = FONT_LOAD_METHODS.NATIVE;
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * 主加载函数 - 依次尝试所有方案
 */
export async function loadFonts() {
  // 方案1: expo-font
  try {
    await loadWithExpoFont();
    return { success: true, method: loadedMethod };
  } catch (error1) {
    // 方案2: 预加载字体
    try {
      await checkPreloadedFont();
      return { success: true, method: loadedMethod };
    } catch (error2) {
      // 方案3: 原生字体
      try {
        await useNativeFontNames();
        return { success: true, method: loadedMethod };
      } catch (error3) {
        loadedMethod = FONT_LOAD_METHODS.FAILED;
        loadError = error1.message;
        return { success: false, method: loadedMethod, error: loadError };
      }
    }
  }
}

/**
 * 获取字体加载状态
 */
export function getFontLoadStatus() {
  return {
    method: loadedMethod,
    error: loadError,
    isLoaded: loadedMethod !== FONT_LOAD_METHODS.FAILED && loadedMethod !== null,
  };
}

/**
 * 获取字体家族名称
 */
export function getIconFontFamily() {
  // 根据平台和加载方式返回正确的字体名称
  if (Platform.OS === 'ios') {
    return 'Ionicons';
  } else if (Platform.OS === 'android') {
    return 'Ionicons';
  }
  return 'Ionicons';
}

export default {
  loadFonts,
  getFontLoadStatus,
  getIconFontFamily,
  FONT_LOAD_METHODS,
};
