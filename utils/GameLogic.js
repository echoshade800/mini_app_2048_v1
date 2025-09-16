/**
 * 2048游戏逻辑工具类
 * 包含所有游戏核心逻辑：移动、合并、胜负判断等
 */

// 生成唯一ID的简单实现
function nanoid() {
  return Math.random().toString(36).substr(2, 9);
}

// 创建空的4x4棋盘
export function createEmptyBoard() {
  return Array(4).fill(null).map(() => Array(4).fill(null));
}

// 获取空位置
export function getEmptyPositions(board) {
  const empty = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (board[row][col] === null || board[row][col] === 0) {
        empty.push({ row, col });
      }
    }
  }
  return empty;
}

// 在随机空位置添加新瓦片
export function addRandomTile(board) {
  const emptyPositions = getEmptyPositions(board);
  if (emptyPositions.length === 0) return board;
  
  const randomPos = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
  const value = Math.random() < 0.9 ? 2 : 4; // 90% 概率是2，10%概率是4
  
  const newBoard = board.map(row => [...row]);
  newBoard[randomPos.row][randomPos.col] = {
    value,
    row: randomPos.row,
    col: randomPos.col,
    tileId: 't_' + nanoid()
  };
  return newBoard;
}

// 初始化游戏棋盘（添加两个随机瓦片）
export function initializeBoard() {
  let board = createEmptyBoard();
  board = addRandomTile(board);
  board = addRandomTile(board);
  return board;
}

// 向左移动一行的核心逻辑
function moveRowLeft(row) {
  // 1. 移除空值并紧缩到左侧
  let filtered = row.filter(tile => tile !== null && tile !== 0);
  
  // 2. 合并相邻相同的数字
  let score = 0;
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i].value === filtered[i + 1].value) {
      // 合并时保持第一个瓦片的ID，更新值
      filtered[i] = {
        ...filtered[i],
        value: filtered[i].value * 2
      };
      score += filtered[i].value;
      filtered[i + 1] = null;
      i++; // 跳过下一个，防止连锁合并
    }
  }
  
  // 3. 再次移除空值并填充到长度4
  filtered = filtered.filter(tile => tile !== null);
  while (filtered.length < 4) {
    filtered.push(null);
  }
  
  return { row: filtered, score };
}

// 矩阵转置
function transpose(board) {
  return board[0].map((_, colIndex) => board.map(row => row[colIndex]));
}

// 翻转每一行
function reverseRows(board) {
  return board.map(row => [...row].reverse());
}

// 检查两个棋盘是否相同
function boardsEqual(board1, board2) {
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const tile1 = board1[row][col];
      const tile2 = board2[row][col];
      
      if (tile1 === null && tile2 === null) continue;
      if (tile1 === null || tile2 === null) return false;
      if (tile1.value !== tile2.value) return false;
    }
  }
  return true;
}

// 更新瓦片位置信息
function updateTilePositions(board) {
  const newBoard = board.map(row => [...row]);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (newBoard[row][col]) {
        newBoard[row][col] = {
          ...newBoard[row][col],
          row,
          col
        };
        return false;
      }
    }
  }
  return newBoard;
}

// 主要的移动函数
export function move(board, direction) {
  let newBoard = board.map(row => [...row]);
  let totalScore = 0;
  
  switch (direction) {
    case 'left':
      for (let row = 0; row < 4; row++) {
        const result = moveRowLeft(newBoard[row]);
        newBoard[row] = result.row;
        totalScore += result.score;
      }
      break;
      
    case 'right':
      // 翻转每行 -> 向左移动 -> 再翻转回来
      newBoard = reverseRows(newBoard);
      for (let row = 0; row < 4; row++) {
        const result = moveRowLeft(newBoard[row]);
        newBoard[row] = result.row;
        totalScore += result.score;
      }
      newBoard = reverseRows(newBoard);
      break;
      
    case 'up':
      // 转置 -> 向左移动 -> 转置回来
      newBoard = transpose(newBoard);
      for (let row = 0; row < 4; row++) {
        const result = moveRowLeft(newBoard[row]);
        newBoard[row] = result.row;
        totalScore += result.score;
      }
      newBoard = transpose(newBoard);
      break;
      
    case 'down':
      // 转置 -> 翻转每行 -> 向左移动 -> 翻转回来 -> 转置回来
      newBoard = transpose(newBoard);
      newBoard = reverseRows(newBoard);
      for (let row = 0; row < 4; row++) {
        const result = moveRowLeft(newBoard[row]);
        newBoard[row] = result.row;
        totalScore += result.score;
      }
      newBoard = reverseRows(newBoard);
      newBoard = transpose(newBoard);
      break;
  }
  
  // 更新所有瓦片的位置信息
  newBoard = updateTilePositions(newBoard);
  
  // 检查移动是否有效（棋盘是否发生变化）
  const isValidMove = !boardsEqual(board, newBoard);
  
  return {
    board: newBoard,
    score: totalScore,
    isValidMove
  };
}

// 检查是否获胜（出现2048）
export function checkWin(board) {
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (board[row][col] && board[row][col].value === 2048) {
        return true;
      }
    }
  }
  return false;
}

// 检查游戏是否结束
export function checkGameOver(board) {
  // 如果还有空位，游戏继续
  if (getEmptyPositions(board).length > 0) {
    return false;
  }
  
  // 检查是否可以合并（四个方向都尝试）
  const directions = ['left', 'right', 'up', 'down'];
  for (let direction of directions) {
    const result = move(board, direction);
    if (result.isValidMove) {
      return false;
    }
  }
  
  return true;
}

// 获取棋盘上的最高数字
export function getHighestTile(board) {
  let highest = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (board[row][col] && board[row][col].value > highest) {
        highest = board[row][col].value;
      }
    }
  }
  return highest;
}

// 测试向量验证函数（用于开发调试）
export function runTestVectors() {
  const tests = [
    {
      name: 'Test 1: [null,4,2,2] → [4,4,null,null]',
      input: [null, 4, 2, 2],
      expected: [4, 4, null, null]
    },
    {
      name: 'Test 2: [2,2,4,4] → [4,8,null,null]',
      input: [2, 2, 4, 4],
      expected: [4, 8, null, null]
    },
    {
      name: 'Test 3: [2,2,2,null] → [4,2,null,null]',
      input: [2, 2, 2, null],
      expected: [4, 2, null, null]
    }
  ];
  
  console.log('Running test vectors...');
  tests.forEach(test => {
    const result = moveRowLeft(test.input);
    const passed = JSON.stringify(result.row) === JSON.stringify(test.expected);
    console.log(`${test.name}: ${passed ? 'PASS' : 'FAIL'}`);
    if (!passed) {
      console.log(`  Expected: ${JSON.stringify(test.expected)}`);
      console.log(`  Got: ${JSON.stringify(result.row)}`);
    }
  });
}