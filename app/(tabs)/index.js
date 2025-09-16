import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  PanResponder,
  Animated,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../../contexts/GameContext';
import {
  initializeBoard,
  move,
  addRandomTile,
  checkWin,
  checkGameOver,
  getHighestTile
} from '../../utils/GameLogic';
import PiecesProxy from '../../src/game/PiecesProxy';
import PieceDraw from '../../src/game/render/PieceDraw';

// 动态导入 Haptics，避免 H5 环境报错
let Haptics = null;
if (Platform.OS !== 'web') {
  try {
    Haptics = require('expo-haptics');
  } catch (error) {
    console.log('Haptics not available on this platform');
  }
}

const { width: screenWidth } = Dimensions.get('window');
// H5 适配：根据平台调整棋盘大小
const BOARD_SIZE = Platform.OS === 'web' 
  ? Math.min(screenWidth - 40, 400) // H5 上稍大一些
  : Math.min(screenWidth - 40, 320);

// Grid constants adapted from original 2048
const GRID_SIZE = 4;
const GRID_SPACING = 10;
const GRID_ROW_CELLS = 4;
const TILE_SIZE = Math.floor((BOARD_SIZE - GRID_SPACING * (GRID_ROW_CELLS + 1)) / GRID_ROW_CELLS);
const TILE_BORDER_RADIUS = 3;

// Position calculation helpers
const cellPosition = (x) => {
  return GRID_SPACING + x * (TILE_SIZE + GRID_SPACING);
};

// Helper functions for tile positioning
const toX = (col) => cellPosition(col);
const toY = (row) => cellPosition(row);

/**
 * Home Screen - Main Game Board
 * Purpose: Play 2048 + quick actions (score, best, new game)
 * Features: 4x4 board, swipe gestures, keyboard controls, animations
 */
export default function HomeScreen() {
  const { state, dispatch, saveGameData } = useGame();
  const [gameStartTime, setGameStartTime] = useState(null);
  const [moveCount, setMoveCount] = useState(0);
  const piecesProxyRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // 用 ref 跟踪最新的 isAnimating 状态，确保手势处理器能获取到最新值
  const isAnimatingRef = useRef(isAnimating);
  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);

  // Initialize pieces proxy
  useEffect(() => {
    if (state.board && !piecesProxyRef.current) {
      piecesProxyRef.current = new PiecesProxy(state.board);
    }
  }, [state.board]);

  // Animation loop
  const animationLoop = useCallback(() => {
    if (!piecesProxyRef.current) return;
    
    const hasAnimations = piecesProxyRef.current.hasAnimations();
    
    if (hasAnimations) {
      // 继续动画循环
      animationFrameRef.current = requestAnimationFrame(animationLoop);
    } else {
      // 动画完成，提交结果
      const hasCommitted = piecesProxyRef.current.commitAnimations();
      if (hasCommitted) {
        // 更新游戏状态
        const newBoard = piecesProxyRef.current.getBoard();
        dispatch({ type: 'SET_BOARD', payload: newBoard });
        
        // 生成新瓦片
        const boardWithNewTile = addRandomTile(newBoard);
        piecesProxyRef.current.setBoard(boardWithNewTile);
        dispatch({ type: 'SET_BOARD', payload: boardWithNewTile });
        
        // 检查游戏状态
        if (checkWin(boardWithNewTile) && state.gameState === 'playing') {
          dispatch({ type: 'SET_GAME_STATE', payload: 'won' });
          showWinModal();
        } else if (checkGameOver(boardWithNewTile)) {
          dispatch({ type: 'SET_GAME_STATE', payload: 'lost' });
          endGame(boardWithNewTile, state.score, false).then(() => {
            showLoseModal();
          });
        }
      }
      
      setIsAnimating(false);
    }
  }, [state.gameState, state.score, dispatch]);
  // Initialize game on first load
  useEffect(() => {
    if (state.isLoading) return;
    
    // Show onboarding if needed
    if (state.showOnboarding) {
      router.replace('/onboarding');
      return;
    }
    
    // Initialize board if empty
    if (state.board.every(row => row.every(cell => cell === null))) {
      startNewGame();
    }
  }, [state.isLoading, state.showOnboarding]);

  // Keyboard controls for web
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyPress = (event) => {
      if (isAnimating) return;
      
      const keyMap = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
      };

      if (keyMap[event.key]) {
        event.preventDefault();
        handleMove(keyMap[event.key]);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isAnimating, state.board]);

  // 清理动画帧
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startNewGame = () => {
    const newBoard = initializeBoard();
    const gameData = {
      id: Date.now().toString(),
      startedAt: new Date().toISOString(),
      moves: 0,
    };

    dispatch({ type: 'NEW_GAME', payload: { board: newBoard, gameData } });
    piecesProxyRef.current = new PiecesProxy(newBoard);
    setGameStartTime(Date.now());
    setMoveCount(0);
  };

  const handleMove = useCallback(async (direction) => {
    if (state.gameState !== 'playing' || isAnimating || !piecesProxyRef.current) return;

    const prev = state.board;
    const result = move(state.board, direction);
    
    if (!result.isValidMove) {
      // Invalid move - shake animation and haptic
      if (state.hapticsOn && Platform.OS !== 'web') {
        if (Haptics) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
      return;
    }

    // 开始动画
    setIsAnimating(true);

    // Update score
    const newScore = state.score + result.score;
    dispatch({ type: 'UPDATE_SCORE', payload: newScore });

    // TODO: 使用 PiecesProxy 创建移动/合并动画
    // 这里需要分析 prev 和 result.board 的差异，创建相应的动画
    
    // 启动动画循环
    animationFrameRef.current = requestAnimationFrame(animationLoop);
    
    setMoveCount(prev => prev + 1);

    // Haptic feedback for valid move
    if (state.hapticsOn && Platform.OS !== 'web') {
      if (Haptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [state.gameState, isAnimating, state.board, state.score, dispatch, state.hapticsOn, animationLoop]);

  // 用 useMemo 重建 PanResponder，避免旧值问题
  const panResponder = useMemo(() => PanResponder.create({
    // 尝试尽早接管（动画时不接管）
    onStartShouldSetPanResponder: () => !isAnimatingRef.current,
    onMoveShouldSetPanResponder: (_evt, g) => {
      if (isAnimatingRef.current) return false;
      const { dx, dy } = g;
      const THRESHOLD = 20; // 统一阈值
      return Math.abs(dx) > THRESHOLD || Math.abs(dy) > THRESHOLD;
    },
    // 有子元素（按钮/文字）时，capture 有助于父级接管
    onStartShouldSetPanResponderCapture: () => !isAnimatingRef.current,
    onMoveShouldSetPanResponderCapture: (_evt, g) => {
      if (isAnimatingRef.current) return false;
      const { dx, dy } = g;
      const THRESHOLD = 20;
      return Math.abs(dx) > THRESHOLD || Math.abs(dy) > THRESHOLD;
    },
    onPanResponderRelease: (_evt, g) => {
      if (isAnimatingRef.current) return;
      const { dx, dy } = g;
      const THRESHOLD = 20;

      if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;

      const dir = Math.abs(dx) >= Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');

      handleMove(dir);
    },
    onShouldBlockNativeResponder: () => true,
  }), [handleMove]); // 只依赖稳定的 handleMove

  const endGame = async (finalBoard, finalScore, won) => {
    const endTime = Date.now();
    const duration = gameStartTime ? Math.floor((endTime - gameStartTime) / 1000) : 0;
    const highestTile = getHighestTile(finalBoard);

    const gameResult = {
      id: state.currentGame?.id || Date.now().toString(),
      startedAt: state.currentGame?.startedAt || new Date().toISOString(),
      endedAt: new Date().toISOString(),
      durationSec: duration,
      finalScore,
      highestTile,
      moves: moveCount,
      won,
    };

    // Update statistics
    const stats = {
      maxLevel: Math.max(state.maxLevel, highestTile),
      maxScore: Math.max(state.maxScore, finalScore),
      maxTime: won && (state.maxTime === 0 || duration < state.maxTime) ? duration : state.maxTime,
    };

    dispatch({ type: 'UPDATE_STATS', payload: stats });
    dispatch({ type: 'ADD_GAME_TO_HISTORY', payload: gameResult });

    // Save to storage
    await saveGameData({
      ...stats,
      gameHistory: [gameResult, ...state.gameHistory].slice(0, 50),
    });
  };

  const showWinModal = () => {
    Alert.alert(
      '🎉 You Won!',
      'Congratulations! You reached 2048!\n\nWould you like to continue playing or start a new game?',
      [
        {
          text: 'Continue',
          onPress: () => dispatch({ type: 'SET_GAME_STATE', payload: 'playing' }),
        },
        {
          text: 'New Game',
          onPress: () => {
            endGame(state.board, state.score, true).then(() => {
              startNewGame();
            });
          },
        },
      ]
    );
  };

  const showLoseModal = () => {
    Alert.alert(
      '😞 Game Over',
      `Final Score: ${state.score}\nHighest Tile: ${getHighestTile(state.board)}\n\nBetter luck next time!`,
      [
        {
          text: 'New Game',
          onPress: startNewGame,
        },
        {
          text: 'View History',
          onPress: () => router.push('/history'),
        },
      ]
    );
  };

  const getTileStyle = (value) => {
    // Original 2048 color scheme
    const tileColors = {
      2: { backgroundColor: '#eee4da', color: '#776e65' },
      4: { backgroundColor: '#ede0c8', color: '#776e65' },
      8: { backgroundColor: '#f2b179', color: '#f9f6f2' },
      16: { backgroundColor: '#f59563', color: '#f9f6f2' },
      32: { backgroundColor: '#f67c5f', color: '#f9f6f2' },
      64: { backgroundColor: '#f65e3b', color: '#f9f6f2' },
      128: { backgroundColor: '#edcf72', color: '#f9f6f2', fontSize: 45 },
      256: { backgroundColor: '#edcc61', color: '#f9f6f2', fontSize: 45 },
      512: { backgroundColor: '#edc850', color: '#f9f6f2', fontSize: 45 },
      1024: { backgroundColor: '#edc53f', color: '#f9f6f2', fontSize: 35 },
      2048: { backgroundColor: '#edc22e', color: '#f9f6f2', fontSize: 35 },
      4096: { backgroundColor: '#3c3a32', color: '#f9f6f2', fontSize: 30 },
      8192: { backgroundColor: '#3c3a32', color: '#f9f6f2', fontSize: 30 },
    };

    const tileClass = tileColors[value] || { 
      backgroundColor: '#3c3a32', 
      color: '#f9f6f2', 
      fontSize: 30 
    };
    
    return tileClass;
  };

  const getTileFontSize = (value) => {
    if (value < 100) return 55;
    if (value < 1000) return 45;
    if (value < 10000) return 35;
    return 30;
  };

  // 渲染器：完全不区分是否动画，只调用 piece.draw(...)
  const drawPieces = () => {
    if (!piecesProxyRef.current) return null;
    
    const allPieces = piecesProxyRef.current.getAllPieces();
    const layout = {
      tileSize: TILE_SIZE,
      toX: (col) => toX(col),
      toY: (row) => toY(row),
      tileStyle: styles.tile,
      tileTextStyle: styles.tileText,
    };
    
    return allPieces.map((item, index) => {
      const { piece, row, col, isStatic } = item;
      
      // 如果不是装饰类，临时包一层 PieceDraw
      const renderer = (typeof piece.draw === 'function') ? piece : new PieceDraw(piece);
      
      const ctx = { row, col };
      return renderer.draw(ctx, layout);
    });
  };
  if (state.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* H5 适配：添加状态栏 */}
      {Platform.OS !== 'web' && <StatusBar barStyle="dark-content" />}
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.scoreContainer}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>SCORE</Text>
            <Text style={styles.scoreValue}>{state.score}</Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>BEST</Text>
            <Text style={styles.scoreValue}>{state.bestScore}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.newGameButton} onPress={startNewGame}>
          <Ionicons name="refresh" size={16} color="#ffffff" />
          <Text style={styles.newGameText}>New Game</Text>
        </TouchableOpacity>
      </View>

      {/* Game Board */}
      <View style={styles.gameContainer}>
        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>
            Join the tiles, get to 2048!
          </Text>
          <TouchableOpacity onPress={() => router.push('/history')}>
            <Text style={styles.historyLink}>View History</Text>
          </TouchableOpacity>
        </View>

        <View style={{ position: 'relative' }}>
          {/* 手势层：只覆盖棋盘区域 */}
          <View
            style={{ position: 'absolute', width: BOARD_SIZE, height: BOARD_SIZE, zIndex: 10 }}
            pointerEvents="box-only"
            collapsable={false}
            {...panResponder.panHandlers}
          />
          {/* 棋盘本体 */}
          <Animated.View
            style={[
              styles.board,
              { width: BOARD_SIZE, height: BOARD_SIZE }
            ]}
          >
            {/* Background grid */}
            {Array.from({ length: 16 }).map((_, i) => {
              const r = Math.floor(i / GRID_ROW_CELLS), c = i % GRID_ROW_CELLS;
              return (
                <View
                  key={i}
                  style={[styles.gridCell, { width: TILE_SIZE, height: TILE_SIZE, left: toX(c), top: toY(r) }]}
                />
              );
            })}

            {/* 统一渲染所有棋子 */}
            {drawPieces()}
          </Animated.View>
        </View>

        {/* Game instructions for mobile */}
        <View style={styles.controls}>
          <Text style={styles.controlsText}>
            {Platform.OS === 'web' 
              ? 'Use arrow keys or mouse swipe to move tiles' 
              : 'Swipe in any direction to move tiles'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf8ef',
    paddingHorizontal: Platform.OS === 'web' ? 16 : 20,
    // H5 适配：添加最小高度
    ...(Platform.OS === 'web' && {
      minHeight: '100vh',
      maxWidth: 600,
      marginHorizontal: 'auto',
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#776e65',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'web' ? 16 : 20,
    // H5 适配：添加顶部间距
    ...(Platform.OS === 'web' && {
      paddingTop: 20,
    }),
  },
  scoreContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  scoreBox: {
    backgroundColor: '#bbada0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: Platform.OS === 'web' ? 80 : 70,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#eee4da',
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  newGameButton: {
    backgroundColor: '#8f7a66',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    // H5 适配：添加鼠标悬停效果
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  newGameText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  gameContainer: {
    flex: 1,
    alignItems: 'center',
  },
  instructions: {
    alignItems: 'center',
    marginBottom: 20,
  },
  instructionsText: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#776e65',
    marginBottom: 8,
    textAlign: 'center',
  },
  historyLink: {
    fontSize: 14,
    color: '#667eea',
    textDecorationLine: 'underline',
    // H5 适配：添加鼠标悬停效果
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  board: {
    backgroundColor: '#bbada0', // Original game board color
    borderRadius: 6,
    padding: GRID_SPACING,
    position: 'relative',
    marginBottom: 20,
  },
  gridCell: {
    backgroundColor: '#cdc1b4', // Original empty cell color
    borderRadius: TILE_BORDER_RADIUS,
    position: 'absolute',
  },
  tile: {
    borderRadius: TILE_BORDER_RADIUS,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    // H5 适配：添加用户选择禁用
    ...(Platform.OS === 'web' && {
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
  },
  tileText: {
    fontWeight: '700', // Bold font weight like original
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'Helvetica Neue',
      android: 'Roboto',
      web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
    // H5 适配：添加用户选择禁用
    ...(Platform.OS === 'web' && {
      userSelect: 'none',
      WebkitUserSelect: 'none',
    }),
  },
  controls: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 16 : 20,
    paddingBottom: Platform.OS === 'web' ? 20 : 0,
  },
  controlsText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#8f7a66',
    textAlign: 'center',
    lineHeight: 20,
  },
});