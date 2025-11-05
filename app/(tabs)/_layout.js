import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  // 计算底部安全区域：确保交互元素至少 20pt 间距在 Home Indicator 上方
  // iPhone X 系列：insets.bottom ≈ 34pt，所以 paddingBottom = 34pt
  // 旧款 iPhone：insets.bottom = 0，使用最小 20pt 间距
  const bottomSafeArea = Platform.OS === 'ios' ? insets.bottom : 0;
  const minBottomPadding = 20; // 最小间距，确保舒适的触摸区域
  const tabBarPaddingBottom = Platform.OS === 'ios' 
    ? Math.max(bottomSafeArea, minBottomPadding) 
    : minBottomPadding;
  
  // 计算 tab bar 高度：基础高度 + 安全区域
  // 基础高度包括：图标 + 文字 + 上下内边距
  const baseTabBarHeight = 60;
  const tabBarHeight = Platform.OS === 'ios' 
    ? baseTabBarHeight + bottomSafeArea 
    : baseTabBarHeight;
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          paddingTop: 8,
          // 底部内边距：确保交互元素（图标和文字）至少 20pt 间距在 Home Indicator 上方
          // 在 iPhone X 系列上，insets.bottom ≈ 34pt，所以 paddingBottom = 34pt
          // 背景颜色会自动延伸到屏幕底部（通过 height 设置）
          paddingBottom: tabBarPaddingBottom,
          // 总高度：基础高度 + 安全区域
          // 这样背景会延伸到屏幕底部，但交互内容在安全区域上方
          height: tabBarHeight,
          // 使用 elevation (Android) 和 shadow (iOS) 确保视觉效果
          ...(Platform.OS === 'android' && { elevation: 8 }),
          ...(Platform.OS === 'ios' && {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }),
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}