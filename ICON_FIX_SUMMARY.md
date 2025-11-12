# 图标显示问题修复总结

## 问题描述
在宿主 APP 中,所有图标(Home、Profile、Tutorial 中的箭头等)都显示为问号(?)

## 根本原因
- 应用使用 `@expo/vector-icons` 来显示图标,这些图标依赖于字体文件
- 在 Expo Go 环境中,字体会自动加载,所以图标正常显示
- 在宿主 APP 环境中,需要手动配置字体加载

## 已完成的修复

### 1. 代码层面
- ✅ 移除了对 `expo-font` 和 `expo-splash-screen` 的依赖(这些在宿主 APP 中不可用)
- ✅ 更新了 `hooks/useFrameworkReady.js`,简化了初始化逻辑
- ✅ 创建了 `utils/FontLoader.js` 用于字体状态调试

### 2. 构建配置
- ✅ 创建了 `react-native.config.js` 配置字体资源
- ✅ 创建了 `scripts/copy-fonts.js` 自动复制字体文件
- ✅ 更新了 `package.json` 的构建脚本,自动执行字体复制

### 3. 字体文件
- ✅ 所有 15 个字体文件已复制到 `ios/rnbundle/fonts/` 目录
  - Ionicons.ttf (最重要 - 应用主要使用这个)
  - MaterialIcons.ttf
  - FontAwesome.ttf
  - 以及其他 12 个字体文件

### 4. 文档
- ✅ 创建了 `ios/FONT_SETUP.md` 详细说明字体配置
- ✅ 创建了 `ios/fonts.json` 字体配置文件
- ✅ 更新了 `README.md`,添加了 iOS Mini App 部署章节

## 宿主 APP 需要做的配置 (重要!)

宿主 APP 开发者需要在 **Info.plist** 中注册字体文件:

```xml
<key>UIAppFonts</key>
<array>
    <string>fonts/Ionicons.ttf</string>
    <string>fonts/MaterialIcons.ttf</string>
    <string>fonts/FontAwesome.ttf</string>
    <string>fonts/FontAwesome5_Solid.ttf</string>
    <string>fonts/FontAwesome5_Regular.ttf</string>
    <string>fonts/FontAwesome5_Brands.ttf</string>
    <string>fonts/MaterialCommunityIcons.ttf</string>
    <string>fonts/AntDesign.ttf</string>
    <string>fonts/Entypo.ttf</string>
    <string>fonts/EvilIcons.ttf</string>
    <string>fonts/Feather.ttf</string>
    <string>fonts/Foundation.ttf</string>
    <string>fonts/Octicons.ttf</string>
    <string>fonts/SimpleLineIcons.ttf</string>
    <string>fonts/Zocial.ttf</string>
</array>
```

### 最小配置(如果只想支持本应用)
如果宿主 APP 只加载本 Mini App,最少只需要注册:
```xml
<key>UIAppFonts</key>
<array>
    <string>fonts/Ionicons.ttf</string>
    <string>fonts/MaterialIcons.ttf</string>
</array>
```

## 测试步骤

1. **重新部署 Mini App**
   ```bash
   npm run deploy:ios
   ```

2. **宿主 APP 配置**
   - 在 Info.plist 中添加上述字体配置
   - 确保能够访问 Mini App bundle 中的 `fonts/` 目录

3. **验证**
   - 启动宿主 APP
   - 加载 Mini App
   - 检查以下位置的图标:
     - ✓ 底部导航: Home 和 Profile 图标
     - ✓ Tutorial 页面: 上下左右箭头图标
     - ✓ Profile 页面: 奖杯、时钟等图标

## 调试信息

如果图标仍然无法显示,可以检查:

1. **控制台日志**
   - 开发模式下会自动打印字体配置信息
   - 查找 "Font Configuration" 相关日志

2. **文件检查**
   - 确认 `ios/rnbundle/fonts/` 目录存在
   - 确认字体文件大小正常(Ionicons.ttf 应该约 380KB)

3. **宿主 APP 日志**
   - 检查是否有字体加载失败的错误
   - 检查文件路径是否正确

## 文件清单

### 修改的文件
- `hooks/useFrameworkReady.js`
- `app/_layout.js`
- `package.json`
- `README.md`

### 新增的文件
- `react-native.config.js`
- `scripts/copy-fonts.js`
- `utils/FontLoader.js`
- `ios/fonts.json`
- `ios/FONT_SETUP.md`
- `ios/rnbundle/fonts/*.ttf` (15 个字体文件)

## 下一步

1. **立即部署** - 运行 `npm run deploy:ios` 将更新上传到 S3
2. **通知宿主 APP 团队** - 提供 `ios/FONT_SETUP.md` 文档给他们
3. **测试验证** - 在宿主 APP 中加载新版本并验证图标显示

## 备注

- 字体文件已经打包在 bundle 中,不需要额外下载
- 所有字体文件总大小约 3MB
- 这是标准的 React Native 字体配置方式,没有使用任何特殊或不稳定的 API

