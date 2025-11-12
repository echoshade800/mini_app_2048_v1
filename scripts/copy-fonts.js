const fs = require('fs');
const path = require('path');

// 源字体目录
const sourceFontsDir = path.join(
  __dirname,
  '..',
  'ios',
  'rnbundle',
  'assets',
  'node_modules',
  '@expo',
  'vector-icons',
  'build',
  'vendor',
  'react-native-vector-icons',
  'Fonts'
);

// 目标字体目录 - 放到 bundle 根目录的 fonts 文件夹
const targetFontsDir = path.join(__dirname, '..', 'ios', 'rnbundle', 'fonts');

// 需要复制的字体文件
const fontFiles = [
  'Ionicons.ttf',
  'MaterialIcons.ttf',
  'FontAwesome.ttf',
  'FontAwesome5_Solid.ttf',
  'FontAwesome5_Regular.ttf',
  'FontAwesome5_Brands.ttf',
  'MaterialCommunityIcons.ttf',
  'AntDesign.ttf',
  'Entypo.ttf',
  'EvilIcons.ttf',
  'Feather.ttf',
  'Foundation.ttf',
  'Octicons.ttf',
  'SimpleLineIcons.ttf',
  'Zocial.ttf',
];

// 创建目标目录
if (!fs.existsSync(targetFontsDir)) {
  fs.mkdirSync(targetFontsDir, { recursive: true });
  console.log('✓ 创建字体目录:', targetFontsDir);
}

// 复制字体文件
let copiedCount = 0;
fontFiles.forEach((fontFile) => {
  const sourcePath = path.join(sourceFontsDir, fontFile);
  const targetPath = path.join(targetFontsDir, fontFile);

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    copiedCount++;
    console.log(`✓ 复制字体: ${fontFile}`);
  } else {
    console.warn(`⚠ 字体文件不存在: ${fontFile}`);
  }
});

console.log(`\n✓ 完成! 已复制 ${copiedCount} 个字体文件到 ios/rnbundle/fonts/`);
console.log('字体文件路径: fonts/*.ttf');

