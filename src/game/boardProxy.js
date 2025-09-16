import Piece from './Piece';
import PieceDraw from './render/PieceDraw';
import PieceMoveDraw from './render/PieceMoveDraw';
import PieceMergeDraw from './render/PieceMergeDraw';

// 计算相碰点（pre-merge位置）
function calculatePreMergePosition(to, direction) {
  switch (direction) {
    case 'left':
      return { r: to.r, c: to.c + 1 };
    case 'right':
      return { r: to.r, c: to.c - 1 };
    case 'up':
      return { r: to.r + 1, c: to.c };
    case 'down':
      return { r: to.r - 1, c: to.c };
    default:
      return to;
  }
}

// 移动：
function movePieceTo(pieces, from, to, layout) {
  const p = pieces[from.r][from.c];           // Piece
  pieces[to.r][to.c] = new PieceMoveDraw(p, { from, to }, layout);
  pieces[from.r][from.c] = null;
}

// 合并：
function mergePieces(pieces, fromA, fromB, to, direction, layout) {
  const a = pieces[fromA.r][fromA.c]; // Piece
  const b = pieces[fromB.r][fromB.c]; // Piece
  const targetValue = a.getValue() * 2;
  const pre = calculatePreMergePosition(to, direction);

  pieces[to.r][to.c] = new PieceMergeDraw(
    a, b, targetValue, 
    { fromA, fromB, to, pre }, 
    layout
  );
  pieces[fromA.r][fromA.c] = null;
  pieces[fromB.r][fromB.c] = null;
}

// 将数字棋盘转换为Piece对象棋盘
function boardToPieces(board) {
  return board.map(row => 
    row.map(cell => cell ? new Piece(cell) : null)
  );
}

// 将Piece对象棋盘转换为数字棋盘
function piecesToBoard(pieces) {
  return pieces.map(row => 
    row.map(cell => {
      if (!cell) return null;
      if (typeof cell.getValue === 'function') {
        return cell.getValue();
      }
      return null;
    })
  );
}

export { 
  movePieceTo, 
  mergePieces, 
  boardToPieces, 
  piecesToBoard,
  calculatePreMergePosition 
};