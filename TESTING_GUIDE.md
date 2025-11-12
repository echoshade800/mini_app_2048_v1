# 字体显示问题测试指南

## 已部署版本
- ✅ 版本: `ios_1.0.0.zip`
- ✅ URL: `https://vsa-bucket-public-new.s3.amazonaws.com/miniapps/2048/ios_1.0.0.zip`
- ✅ 部署时间: 刚刚

## 实施的解决方案

### 1. 恢复之前工作的代码结构
- 恢复了 `SplashScreen.preventAutoHideAsync()` 在模块级别的调用
- 恢复了加载屏幕显示 "Loading..." 的机制
- 这是之前工作版本 (提交 5b34814) 的结构

### 2. 多方案字体加载器
创建了 `utils/FontLoader.js`，依次尝试三种方案:

**方案1: expo-font 异步加载** (推荐)
- 使用 `Font.loadAsync()` 动态加载字体
- 适合大多数集成了Expo的宿主APP

**方案2: 假设字体已预加载**
- 如果方案1失败，假设字体已被宿主APP预注册
- 继续正常运行

**方案3: 使用原生字体名称**
- 兜底方案，使用平台原生字体名

### 3. 应用内调试页面
在 Profile 页面添加了"Font Status (Debug)"部分，显示:
- ✅/✗ 字体加载状态
- 使用的加载方案
- 测试图标显示
- 错误信息（如果有）

## 测试步骤

### 步骤1: 在宿主APP中加载新版本
1. 打开宿主APP
2. 清除Mini App缓存（如果有缓存功能）
3. 重新加载 2048 Mini App
4. 应该会看到短暂的 "Loading..." 屏幕

### 步骤2: 检查图标显示

#### A. 底部导航栏
- 打开应用后，查看底部的 "Home" 和 "Profile" 按钮
- **期望**: 看到房子图标和人像图标
- **如果失败**: 会看到 "?" 或方框

#### B. Tutorial 页面
- 进入 Profile > View Tutorial
- 查看第3页 "Moving Tiles"
- **期望**: 看到上下左右箭头图标
- **如果失败**: 会看到 "?" 或方框

#### C. Profile 页面的图标
- 在 Profile 页面滚动查看
- **期望**: 看到奖杯、时钟等各种图标
- **如果失败**: 会看到 "?" 或方框

### 步骤3: 查看调试信息（关键！）
1. 进入 **Profile 页面**
2. 向下滚动到 **"Font Status (Debug)"** 部分
3. 查看以下信息:

#### 成功情况:
```
Status: ✓ Loaded (绿色)
Method: expo-font
Test Icons: [显示5个正常图标]
```

#### 部分成功:
```
Status: ✓ Loaded (绿色)
Method: preloaded 或 native
Test Icons: [显示5个正常图标]
```

#### 失败情况:
```
Status: ✗ Failed (红色)
Method: failed
Error: [具体错误信息]
Test Icons: [显示5个"?"或方框]
```

## 根据测试结果的下一步

### 情况A: 全部正常显示 ✅
**恭喜!** 问题已解决。可以正常使用。

**建议**: 如果使用的是 "preloaded" 或 "native" 方案，说明宿主APP已经有字体支持，可以保持现状。

### 情况B: 部分图标显示正常，部分不正常 ⚠️
**可能原因**: 不同的图标来自不同的字体文件

**解决方案**:
1. 截图 Profile 页面的 "Font Status" 部分
2. 记录哪些图标正常、哪些不正常
3. 联系宿主APP开发者，提供详细信息

### 情况C: 所有图标都显示"?" ❌
**可能原因**: 
1. expo-font 在宿主APP中不可用
2. 字体文件路径不正确
3. 需要宿主APP配置

**解决方案**:
请联系宿主APP开发者，提供以下信息:

#### 需要宿主APP配置的内容:
在 `Info.plist` 中添加:

```xml
<key>UIAppFonts</key>
<array>
    <string>fonts/Ionicons.ttf</string>
</array>
```

或者确保:
1. 宿主APP已集成 Expo SDK
2. expo-font 模块可用
3. 可以访问 Mini App bundle 中的字体文件

## 提供给宿主APP开发者的文档

如果需要宿主APP开发者协助，请将以下文件发送给他们:
- `ios/FONT_SETUP.md` - 详细的字体配置说明
- `TESTING_GUIDE.md` - 本文件
- Profile 页面"Font Status"部分的截图

## 常见问题

### Q1: 为什么 Expo Go 中正常，宿主APP中不正常?
**A**: Expo Go 预装了所有字体，而宿主APP需要配置或动态加载。

### Q2: 加载时间会变长吗?
**A**: 首次加载字体约需 0.5-1 秒，之后会被缓存。如果宿主APP预注册字体，则无需等待。

### Q3: 如果所有方案都失败怎么办?
**A**: 应用仍会正常启动和运行，只是图标显示为"?"。功能不受影响，但需要宿主APP配置字体支持。

### Q4: 调试信息会一直显示吗?
**A**: 目前会显示。如果确认问题解决，可以在后续版本中移除或隐藏。

## 总结

本次更新的核心改进:
1. ✅ 恢复了之前工作的代码结构
2. ✅ 实施了多方案容错机制
3. ✅ 添加了可视化调试信息
4. ✅ 确保应用即使字体加载失败也能正常运行

请按照上述步骤测试，并将 Profile 页面的"Font Status"部分截图反馈！

