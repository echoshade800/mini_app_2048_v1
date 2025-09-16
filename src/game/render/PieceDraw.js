import React from 'react';
import { Animated, Text } from 'react-native';

export default class PieceDraw {
  constructor(piece) { 
    this.piece = piece; 
  }

  render({ row, col, layout, anim = {} }) {
    // anim: { translateX, translateY, scale, opacity } —— Animated.Value，可选
    const value = this.piece.getValue();
    const tileStyle = this.getTileStyle(value);
    const size = layout.TILE_SIZE;
    
    const baseTransform = [
      { translateX: anim.translateX ?? layout.toX(col) },
      { translateY: anim.translateY ?? layout.toY(row) },
      { scale: anim.scale ?? 1 },
    ];
    const opacity = anim.opacity ?? 1;

    return (
      <Animated.View
        style={[
          layout.tileStyle,
          {
            width: size,
            height: size,
            opacity,
            transform: baseTransform,
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
            fontSize: value > 512 ? 24 : 32 
          }
        ]}>
          {value}
        </Text>
      </Animated.View>
    );
  }

  getTileStyle(value) {
    // Original 2048 color scheme
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
      4096: { backgroundColor: '#3c3a32', color: '#f9f6f2' },
      8192: { backgroundColor: '#3c3a32', color: '#f9f6f2' },
    };

    return tileColors[value] || { 
      backgroundColor: '#3c3a32', 
      color: '#f9f6f2'
    };
  }
}