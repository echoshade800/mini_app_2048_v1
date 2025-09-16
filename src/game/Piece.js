/**
 * 2048 棋子基类
 * 纯数据模型，不含渲染逻辑
 */
export default class Piece {
  constructor(value) {
    this.value = value; // 2, 4, 8, 16, ...
  }

  getValue() {
    return this.value;
  }

  // 基类的 draw 方法，子类可以重写
  draw(ctx, layout) {
    // 默认不绘制，由装饰器处理
    return null;
  }
}