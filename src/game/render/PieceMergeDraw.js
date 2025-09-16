/**
 * 合并动画装饰器
 * 一边把源棋子从 from 移动到 to，一边在 to 位置绘制目标棋子（合并结果）
 */
import React from 'react';
import { Animated } from 'react-native';
import PieceDraw from './PieceDraw';
import Piece from '../Piece';

const ANIMATE_TIME = 180; // 合并动画时长

export default class PieceMergeDraw extends PieceDraw {
  constructor(pieceA, pieceB, fromPosA, fromPosB, toPos) {
    const targetValue = pieceA.getValue() * 2; // 合并后的值
    super(new Piece(targetValue));
    
    this.pieceA = pieceA;
    this.pieceB = pieceB;
    this.fromPosA = fromPosA;
    this.fromPosB = fromPosB;
    this.toPos = toPos;
    this.startTime = Date.now();
    this.isAnimating = true;
    
    // 创建绘制器
    this.drawA = new PieceDraw(pieceA);
    this.drawB = new PieceDraw(pieceB);
    this.drawTarget = new PieceDraw(new Piece(targetValue));
  }

  draw(ctx, layout) {
    const now = Date.now();
    const elapsed = now - this.startTime;
    const process = Math.min(elapsed / ANIMATE_TIME, 1);
    
    const elements = [];
    
    // 第一阶段：源棋子移动到目标位置 (0% -> 70%)
    if (process < 0.7) {
      const moveProcess = process / 0.7;
      
      // 源棋子 A 移动
      const currentRowA = this.fromPosA.row + (this.toPos.row - this.fromPosA.row) * moveProcess;
      const currentColA = this.fromPosA.col + (this.toPos.col - this.fromPosA.col) * moveProcess;
      const currentXA = layout.toX(currentColA);
      const currentYA = layout.toY(currentRowA);
      
      elements.push(this.drawA.draw({
        ...ctx,
        row: this.fromPosA.row,
        col: this.fromPosA.col,
        animValues: {
          translateX: currentXA,
          translateY: currentYA,
          scale: 1,
          opacity: 1,
        }
      }, layout));
      
      // 源棋子 B 移动
      const currentRowB = this.fromPosB.row + (this.toPos.row - this.fromPosB.row) * moveProcess;
      const currentColB = this.fromPosB.col + (this.toPos.col - this.fromPosB.col) * moveProcess;
      const currentXB = layout.toX(currentColB);
      const currentYB = layout.toY(currentRowB);
      
      elements.push(this.drawB.draw({
        ...ctx,
        row: this.fromPosB.row,
        col: this.fromPosB.col,
        animValues: {
          translateX: currentXB,
          translateY: currentYB,
          scale: 1,
          opacity: 1,
        }
      }, layout));
    }
    
    // 第二阶段：目标棋子出现并放大回弹 (50% -> 100%)
    if (process >= 0.5) {
      const targetProcess = (process - 0.5) / 0.5;
      let scale = 1;
      let opacity = Math.min(targetProcess * 2, 1); // 快速淡入
      
      // 放大回弹效果 (80% -> 100%)
      if (process >= 0.8) {
        const bounceProcess = (process - 0.8) / 0.2;
        if (bounceProcess < 0.5) {
          // 放大阶段
          scale = 1 + bounceProcess * 0.24; // 最大 1.12
        } else {
          // 回弹阶段
          scale = 1.12 - (bounceProcess - 0.5) * 0.24; // 回到 1
        }
      }
      
      const targetX = layout.toX(this.toPos.col);
      const targetY = layout.toY(this.toPos.row);
      
      elements.push(this.drawTarget.draw({
        ...ctx,
        row: this.toPos.row,
        col: this.toPos.col,
        animValues: {
          translateX: targetX,
          translateY: targetY,
          scale,
          opacity,
        }
      }, layout));
    }
    
    // 更新动画完成状态
    if (process >= 1) {
      this.isAnimating = false;
    }
    
    return elements.length === 1 ? elements[0] : <>{elements}</>;
  }

  isComplete() {
    return !this.isAnimating;
  }
}