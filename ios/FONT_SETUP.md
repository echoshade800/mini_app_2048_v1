# 字体设置说明

## 问题说明
本 Mini App 使用了 @expo/vector-icons 来显示图标。这些图标依赖于字体文件才能正确显示。

## 字体文件位置
所有需要的字体文件已经打包在 `ios/rnbundle/fonts/` 目录中。

## 宿主 APP 配置方法

### 方法一:在 Info.plist 中注册字体(推荐)

在宿主 APP 的 `Info.plist` 文件中添加以下配置:

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

### 方法二:确保字体文件可访问

确保宿主 APP 能够访问 Mini App bundle 中的 `fonts/` 目录,并在加载 Mini App 前注册这些字体。

## 字体列表

参考 `fonts.json` 文件查看完整的字体列表。

## 测试

正确配置后,以下图标应该能正常显示:
- 底部导航栏的 Home 和 Profile 图标
- 教程页面的方向箭头图标
- 其他所有使用 Ionicons 的图标

如果图标仍显示为问号(?),请检查:
1. 字体文件是否在正确的位置
2. Info.plist 中的配置是否正确
3. 宿主 APP 是否有权限访问 bundle 中的字体文件

