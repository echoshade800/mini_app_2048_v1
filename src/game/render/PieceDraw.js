/**
 * 静态绘制装饰器
 * 只负责静态棋子的可视化，不关心动画
 */
import React from 'react';
import { Animated, Text } from 'react-native';
import Piece from '../Piece';

export default class PieceDraw extends Piece {
  constructor(piece) {
    super(piece.getValue());
    this.piece = piece;
  }

  draw(ctx, layout) {
    const { row, col, animValues = {} } = ctx;
    const value = this.getValue();
    const tileStyle = this.getTileStyle(value);
    const size = layout.tileSize;
    
    // 计算静态位置
    const baseX = layout.toX(col);
    const baseY = layout.toY(row);
    
    // 应用动画值（如果有）
    const transform = [
      { translateX: animValues.translateX || baseX },
      { translateY: animValues.translateY || baseY },
      { scale: animValues.scale || 1 },
    ];
    
    const opacity = animValues.opacity !== undefined ? animValues.opacity : 1;

    return (
      <Animated.View
        key={`${row}-${col}-${value}-${Date.now()}`}
        style={[
          layout.tileStyle,
          {
            width: size,
            height: size,
            opacity,
            transform,
            backgroundColor: tileStyle.backgroundColor,
            position: 'absolute',
            left: 0,
            top: 0,
          }
        ]}
      >
        <Text style={[
          layout.tileTextStyle, 
          { 
            color: tileStyle.color, 
            fontSize: this.getFontSize(value) 
          }
        ]}>
          {value}
        </Text>
      </Animated.View>
    );
  }

  getTileStyle(value) {
    const tileColors = {
      2: { backgroundColor: '#eee4da', color: '#776e65' },
      4: { backgroundColor: '#ede0c8', color: '#776e65' },
      8: { backgroundColor: '#f2b179', color: '#f9f6f2' },
      16: { backgroundColor: '#f59563', color: '#f9f6f2' },
      32: { backgroundColor: '#f67c5f', color: '#f9f6f2' },
      64: { backgroundColor: '#f65e3b', color: '#f9f6f2' },
      128: { backgroundColor: '#edcf72', color: '#f9f6f2' },
      256: { backgroundColor: '#edcc61', color: '#f9f6f2' },
      512: { backgroundColor: '#edc850', color: '#f9f6f2' },
      1024: { backgroundColor: '#edc53f', color: '#f9f6f2' },
      2048: { backgroundColor: '#edc22e', color: '#f9f6f2' },
    };
    
    return tileColors[value] || { backgroundColor: '#3c3a32', color: '#f9f6f2' };
  }

  getFontSize(value) {
    if (value < 100) return 32;
    if (value < 1000) return 28;
    if (value < 10000) return 24;
    return 20;
  }
}