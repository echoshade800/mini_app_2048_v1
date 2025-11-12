/**
 * 字体加载器 - 用于在 Mini App 环境中动态加载字体
 * 
 * 注意:这是一个备用方案。理想情况下,宿主 APP 应该在 Info.plist 中
 * 预先注册所有字体文件。
 */

import { Platform } from 'react-native';

// 字体配置 - 对应 ios/rnbundle/fonts/ 目录中的文件
const FONT_CONFIG = {
  Ionicons: Platform.select({
    ios: 'Ionicons',
    android: 'Ionicons',
    default: 'Ionicons',
  }),
  MaterialIcons: Platform.select({
    ios: 'MaterialIcons',
    android: 'MaterialIcons',
    default: 'MaterialIcons',
  }),
  FontAwesome: Platform.select({
    ios: 'FontAwesome',
    android: 'FontAwesome',
    default: 'FontAwesome',
  }),
  // 更多字体...
};

/**
 * 检查字体是否可用
 * @param {string} fontFamily - 字体名称
 * @returns {boolean}
 */
export function isFontAvailable(fontFamily) {
  // 在 React Native 中,没有直接的 API 来检查字体是否可用
  // 我们假设字体已经通过宿主 APP 注册
  return true;
}

/**
 * 获取字体名称映射
 * @param {string} iconSet - 图标集名称
 * @returns {string}
 */
export function getFontFamily(iconSet) {
  return FONT_CONFIG[iconSet] || iconSet;
}

/**
 * 记录字体加载状态 (用于调试)
 */
export function logFontStatus() {
  if (__DEV__) {
    console.log('Font Configuration:', FONT_CONFIG);
    console.log('Platform:', Platform.OS);
    console.log('Fonts should be loaded by host app from: fonts/*.ttf');
  }
}

// 在开发模式下自动记录字体状态
if (__DEV__) {
  logFontStatus();
}

export default {
  isFontAvailable,
  getFontFamily,
  logFontStatus,
  FONT_CONFIG,
};

