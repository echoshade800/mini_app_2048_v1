/**
 * 位移动画装饰器
 * 处理位移动画，基于 process = (now - start) / ANIMATE_TIME 线性插值 row/col
 */
import { Animated } from 'react-native';
import PieceDraw from './PieceDraw';

const ANIMATE_TIME = 150; // 动画时长 ms

export default class PieceMoveDraw extends PieceDraw {
  constructor(piece, fromPos, toPos) {
    super(piece);
    this.fromPos = fromPos; // { row, col }
    this.toPos = toPos;     // { row, col }
    this.startTime = Date.now();
    this.isAnimating = true;
    
    // 创建动画值
    this.translateX = new Animated.Value(0);
    this.translateY = new Animated.Value(0);
  }

  draw(ctx, layout) {
    const now = Date.now();
    const elapsed = now - this.startTime;
    const process = Math.min(elapsed / ANIMATE_TIME, 1);
    
    // 线性插值计算当前位置
    const currentRow = this.fromPos.row + (this.toPos.row - this.fromPos.row) * process;
    const currentCol = this.fromPos.col + (this.toPos.col - this.fromPos.col) * process;
    
    // 计算实际像素位置
    const currentX = layout.toX(currentCol);
    const currentY = layout.toY(currentRow);
    
    // 更新动画完成状态
    if (process >= 1) {
      this.isAnimating = false;
    }
    
    // 使用当前插值位置绘制
    const animValues = {
      translateX: currentX,
      translateY: currentY,
      scale: 1,
      opacity: 1,
    };
    
    return super.draw({
      ...ctx,
      row: this.fromPos.row, // 使用原始行列作为 key
      col: this.fromPos.col,
      animValues
    }, layout);
  }

  isComplete() {
    return !this.isAnimating;
  }
}