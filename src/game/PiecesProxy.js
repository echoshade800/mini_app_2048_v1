/**
 * 棋盘代理
 * 在移动/合并时，把结果放成对应的装饰器实例
 */
import Piece from './Piece';
import PieceMoveDraw from './render/PieceMoveDraw';
import PieceMergeDraw from './render/PieceMergeDraw';

export default class PiecesProxy {
  constructor(board) {
    this.pieces = board.map(row => row.map(cell => cell ? new Piece(cell) : null));
    this.animatingPieces = []; // 存储动画中的棋子
  }

  // 移动棋子
  movePiece(fromPos, toPos) {
    const piece = this.pieces[fromPos.row][fromPos.col];
    if (!piece) return;
    
    // 创建移动动画装饰器
    const moveDraw = new PieceMoveDraw(piece, fromPos, toPos);
    this.animatingPieces.push(moveDraw);
    
    // 清空原位置，目标位置暂时不放置（等动画完成）
    this.pieces[fromPos.row][fromPos.col] = null;
    this.pieces[toPos.row][toPos.col] = null;
    
    return moveDraw;
  }

  // 合并棋子
  mergePieces(fromPosA, fromPosB, toPos) {
    const pieceA = this.pieces[fromPosA.row][fromPosA.col];
    const pieceB = this.pieces[fromPosB.row][fromPosB.col];
    
    if (!pieceA || !pieceB) return;
    
    // 创建合并动画装饰器
    const mergeDraw = new PieceMergeDraw(pieceA, pieceB, fromPosA, fromPosB, toPos);
    this.animatingPieces.push(mergeDraw);
    
    // 清空源位置和目标位置
    this.pieces[fromPosA.row][fromPosA.col] = null;
    this.pieces[fromPosB.row][fromPosB.col] = null;
    this.pieces[toPos.row][toPos.col] = null;
    
    return mergeDraw;
  }

  // 检查是否有动画在进行
  hasAnimations() {
    return this.animatingPieces.some(piece => !piece.isComplete());
  }

  // 清理完成的动画并提交结果
  commitAnimations() {
    const completedAnimations = this.animatingPieces.filter(piece => piece.isComplete());
    
    completedAnimations.forEach(anim => {
      if (anim instanceof PieceMoveDraw) {
        // 移动完成，放置到目标位置
        this.pieces[anim.toPos.row][anim.toPos.col] = new Piece(anim.getValue());
      } else if (anim instanceof PieceMergeDraw) {
        // 合并完成，放置合并结果
        this.pieces[anim.toPos.row][anim.toPos.col] = new Piece(anim.getValue());
      }
    });
    
    // 移除完成的动画
    this.animatingPieces = this.animatingPieces.filter(piece => !piece.isComplete());
    
    return completedAnimations.length > 0;
  }

  // 获取所有需要绘制的棋子（静态 + 动画）
  getAllPieces() {
    const allPieces = [];
    
    // 添加静态棋子
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const piece = this.pieces[row][col];
        if (piece) {
          allPieces.push({ piece, row, col, isStatic: true });
        }
      }
    }
    
    // 添加动画棋子
    this.animatingPieces.forEach(piece => {
      allPieces.push({ piece, row: 0, col: 0, isStatic: false });
    });
    
    return allPieces;
  }

  // 获取当前棋盘状态（用于游戏逻辑）
  getBoard() {
    return this.pieces.map(row => 
      row.map(piece => piece ? piece.getValue() : null)
    );
  }

  // 设置棋盘状态
  setBoard(board) {
    // 清理所有动画
    this.animatingPieces = [];
    this.pieces = board.map(row => 
      row.map(cell => cell ? new Piece(cell) : null)
    );
  }

  // 添加新棋子（带弹入动画）
  addNewPiece(row, col, value) {
    this.pieces[row][col] = new Piece(value);
    // 这里可以添加弹入动画逻辑
  }
}