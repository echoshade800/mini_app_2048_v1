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
  Easing,
  StatusBar,
  PixelRatio
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

// 像素对齐函数
const pixelAlign = (value) => {
  const pixelRatio = PixelRatio.get();
  return Math.round(value * pixelRatio) / pixelRatio;
};

// Position calculation helpers
const cellPosition = (x) => {
  return pixelAlign(GRID_SPACING + x * (TILE_SIZE + GRID_SPACING));
};

// Helper functions for tile positioning
const toX = (col) => cellPosition(col);
const toY = (row) => cellPosition(row);

// 统一动画配置
const ANIMATION_CONFIG = {
  duration: 150, // 统一时长 150ms
  easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // ease-out 缓动
  useNativeDriver: true,
};
/**
 * Home Screen - Main Game Board
 * Purpose: Play 2048 + quick actions (score, best, new game)
 * Features: 4x4 board, swipe gestures, keyboard controls, animations
 */
export default function HomeScreen() {
  const { state, dispatch, saveGameData } = useGame();
  const [gameStartTime, setGameStartTime] = useState(null);
  const [moveCount, setMoveCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animatedValues = useRef({});
  const ghostTilesRef = useRef([]);
  const animationInProgress = useRef(false);
  const isMounted = useRef(true);
  const boardStateRef = useRef(state.board);

  // 同步 board state 到 ref
  useEffect(() => {
    boardStateRef.current = state.board;
  }, [state.board]);

  // 用 ref 跟踪最新的 isAnimating 状态，确保手势处理器能获取到最新值
  const isAnimatingRef = useRef(isAnimating);
  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  }, [isAnimating]);

  // Track component mount status
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Initialize animations for each tile position
  useEffect(() => {
    // Initialize board shake animation
    if (!animatedValues.current.board) {
      animatedValues.current.board = new Animated.Value(0);
    }
    
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const key = `${row}-${col}`;
        if (!animatedValues.current[key]) {
          animatedValues.current[key] = {
            scale: new Animated.Value(1),
            opacity: new Animated.Value(1),
          };
        }
      }
    }
  }, []);

  // Initialize game on first load
  useEffect(() => {
    if (state.isLoading) return;
    
    // Show onboarding if needed
    if (state.showOnboarding) {
      router.replace('/onboarding');
      return;
    }
    
    // Initialize board if empty
    const isEmpty = state.board.every(row => row.every(cell => cell === null));
    if (isEmpty) {
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

  // Compute UI transitions for sliding animation
  const computeTransitionsUIOnly = (prevBoard, nextBoard, direction) => {
    const moves = [];
    const N = 4;

    const processLine = (cells, isRow, fixedIndex) => {
      const nonEmpty = cells.filter(x => x.v != null);
      const targets = [];
      let i = 0;
      while (i < nonEmpty.length) {
        if (i + 1 < nonEmpty.length && nonEmpty[i].v === nonEmpty[i+1].v) {
          targets.push({v: nonEmpty[i].v * 2, froms: [nonEmpty[i], nonEmpty[i+1]]});
          i += 2;
        } else {
          targets.push({v: nonEmpty[i].v, froms: [nonEmpty[i]]});
          i += 1;
        }
      }
      
      targets.forEach((t, idx) => {
        let destIndex = idx;
        // For right and down movements, reverse the destination index
        if ((isRow && direction === 'right') || (!isRow && direction === 'down')) {
          destIndex = N - 1 - idx;
        }
        
        t.froms.forEach(src => {
          moves.push({
            from: { r: src.r, c: src.c },
            to: isRow
              ? { r: fixedIndex, c: destIndex }
              : { r: destIndex,  c: fixedIndex },
            value: src.v
          });
        });
      });
    };

    if (direction === 'left' || direction === 'right') {
      for (let r = 0; r < N; r++) {
        let line = [];
        for (let c = 0; c < N; c++) {
          const cc = (direction === 'left') ? c : (N - 1 - c);
          line.push({ v: prevBoard[r][cc], r, c: cc });
        }
        processLine(line, true, r);
      }
    } else {
      for (let c = 0; c < N; c++) {
        let line = [];
        for (let r = 0; r < N; r++) {
          const rr = (direction === 'up') ? r : (N - 1 - r);
          line.push({ v: prevBoard[rr][c], r: rr, c });
        }
        processLine(line, false, c);
      }
    }
    return moves;
  };

  // 计算合并目标位置
  const computeMergeTargets = (prevBoard, direction) => {
    const N = 4;
    const mergeTargets = [];

    const processLine = (cells, isRow, fixedIndex) => {
      const nonEmpty = cells.filter(x => x.v != null);
      let i = 0, dest = 0;
      while (i < nonEmpty.length) {
        if (i + 1 < nonEmpty.length && nonEmpty[i].v === nonEmpty[i + 1].v) {
          // 合并发生，计算目标位置
          let targetPos;
          if (isRow) {
            targetPos = direction === 'left' 
              ? { r: fixedIndex, c: dest }
              : { r: fixedIndex, c: N - 1 - dest };
          } else {
            targetPos = direction === 'up'
              ? { r: dest, c: fixedIndex }
              : { r: N - 1 - dest, c: fixedIndex };
          }
          mergeTargets.push(targetPos);
          dest += 1;
          i += 2;
        } else {
          dest += 1;
          i += 1;
        }
      }
    };

    if (direction === 'left' || direction === 'right') {
      for (let r = 0; r < N; r++) {
        const line = [];
        for (let c = 0; c < N; c++) {
          const cc = direction === 'left' ? c : (N - 1 - c);
          line.push({ v: prevBoard[r][cc], r, c: cc });
        }
        processLine(line, true, r);
      }
    } else {
      for (let c = 0; c < N; c++) {
        const line = [];
        for (let r = 0; r < N; r++) {
          const rr = direction === 'up' ? r : (N - 1 - r);
          line.push({ v: prevBoard[rr][c], r: rr, c });
        }
        processLine(line, false, c);
      }
    }
    return mergeTargets;
  };


  const startNewGame = () => {
    const newBoard = initializeBoard();
    const gameData = {
      id: Date.now().toString(),
      startedAt: new Date().toISOString(),
      moves: 0,
    };

    dispatch({ type: 'NEW_GAME', payload: { board: newBoard, gameData } });
    setGameStartTime(Date.now());
    setMoveCount(0);

    // Animate initial tiles appearing
    setTimeout(() => {
      if (isMounted.current) {
        animateNewTiles(createEmptyBoard(), newBoard);
      }
    }, 100);
  };

  const createEmptyBoard = () => {
    return Array(4).fill(null).map(() => Array(4).fill(null));
  };

  const handleMove = useCallback(async (direction) => {
    // 手势去抖：如果动画正在进行，忽略新手势
    if (state.gameState !== 'playing' || animationInProgress.current) return;

    const prev = state.board;
    const result = move(state.board, direction);
    
    if (!result.isValidMove) {
      // Invalid move - shake animation and haptic
      if (state.hapticsOn && Platform.OS !== 'web') {
        if (Haptics) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
      
      // Shake animation
      Animated.sequence([
        Animated.timing(animatedValues.current.board, { 
          toValue: 10, 
          duration: 50, 
          useNativeDriver: true 
        }),
        Animated.timing(animatedValues.current.board, { 
          toValue: -10, 
          duration: 50, 
          useNativeDriver: true 
        }),
        Animated.timing(animatedValues.current.board, { 
          toValue: 0, 
          duration: 50, 
          useNativeDriver: true 
        }),
      ]).start();
      
      return;
    }

    // 标记动画开始
    animationInProgress.current = true;
    setIsAnimating(true);

    // 1. 准备幽灵瓦片和合并数据
    const transitions = computeTransitionsUIOnly(prev, result.board, direction)
      .filter(t => !(t.from.r === t.to.r && t.from.c === t.to.c));
    
    const mergeTargets = computeMergeTargets(prev, direction);
    
    // 2. 创建幽灵瓦片
    ghostTilesRef.current = transitions.map(t => ({
      key: `${t.from.r}-${t.from.c}`,
      value: prev[t.from.r][t.from.c],
      from: t.from,
      to: t.to,
      anim: new Animated.ValueXY({ 
        x: pixelAlign(toX(t.from.c)), 
        y: pixelAlign(toY(t.from.r)) 
      }),
      scale: new Animated.Value(1),
    }));

    // 3. 创建滑动动画
    const slideAnims = ghostTilesRef.current.map(g => 
      Animated.timing(g.anim, {
        toValue: { 
          x: pixelAlign(toX(g.to.c)), 
          y: pixelAlign(toY(g.to.r)) 
        },
        ...ANIMATION_CONFIG,
      })
    );
    
    // 4. 创建合并动画（与滑动同时进行）
    const mergeAnims = ghostTilesRef.current
      .filter(g => mergeTargets.some(mt => mt.r === g.to.r && mt.c === g.to.c))
      .map(g => 
        Animated.timing(g.scale, {
          toValue: 1.1,
          ...ANIMATION_CONFIG,
        })
      );

    // 5. 执行所有动画（统一时长）
    Animated.parallel([
      ...slideAnims,
      ...mergeAnims,
    ]).start(() => {
      // 6. 动画完成后立即清理并更新状态
      if (!isMounted.current) return;
      
      // 计算最终棋盘状态
      const finalBoard = addRandomTile(result.board);
      const newScore = state.score + result.score;
      
      // 立即清理幽灵瓦片
      ghostTilesRef.current = [];
      
      // 批量更新状态
      dispatch({ type: 'SET_BOARD', payload: finalBoard });
      dispatch({ type: 'UPDATE_SCORE', payload: newScore });
      
      // 重置动画状态
      setIsAnimating(false);
      animationInProgress.current = false;
      
      // 为新瓦片添加弹入动画
      animateNewTiles(result.board, finalBoard);
      
      // 更新游戏统计
      setMoveCount(prev => prev + 1);
      
      // 胜负判定
      if (checkWin(finalBoard) && state.gameState === 'playing') {
        dispatch({ type: 'SET_GAME_STATE', payload: 'won' });
        showWinModal();
      } else if (checkGameOver(finalBoard)) {
        dispatch({ type: 'SET_GAME_STATE', payload: 'lost' });
        endGame(finalBoard, newScore, false).then(() => {
          if (!isMounted.current) return;
          showLoseModal();
        });
      }
      
      // 触觉反馈
      if (state.hapticsOn && Platform.OS !== 'web') {
        if (Haptics) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    });
  }, [isAnimating, state.gameState, state.board, state.score, dispatch, saveGameData, state.hapticsOn, state.currentGame, state.maxLevel, state.maxScore, state.maxTime, state.gameHistory, moveCount, gameStartTime]);

  // 用 useMemo 重建 PanResponder，避免旧值问题
  const panResponder = useMemo(() => {
    const checkAnimating = () => animationInProgress.current;
    
    return PanResponder.create({
    // 尝试尽早接管（动画时不接管）
    onStartShouldSetPanResponder: () => !checkAnimating(),
    onMoveShouldSetPanResponder: (_evt, g) => {
      if (checkAnimating()) return false;
      const { dx, dy } = g;
      const THRESHOLD = 20; // 统一阈值
      return Math.abs(dx) > THRESHOLD || Math.abs(dy) > THRESHOLD;
    },
    // 有子元素（按钮/文字）时，capture 有助于父级接管
    onStartShouldSetPanResponderCapture: () => !checkAnimating(),
    onMoveShouldSetPanResponderCapture: (_evt, g) => {
      if (checkAnimating()) return false;
      const { dx, dy } = g;
      const THRESHOLD = 20;
      return Math.abs(dx) > THRESHOLD || Math.abs(dy) > THRESHOLD;
    },
    onPanResponderRelease: (_evt, g) => {
      if (checkAnimating()) return;
      const { dx, dy } = g;
      const THRESHOLD = 20;

      if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;

      const dir = Math.abs(dx) >= Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');

      handleMove(dir);
    },
    onShouldBlockNativeResponder: () => true,
  });
  }, [handleMove]);

  const animateNewTiles = (prevBoard, nextBoard) => {
    // Find new tiles and animate them
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (nextBoard[row][col] && !prevBoard[row][col]) {
          const key = `${row}-${col}`;
          const anim = animatedValues.current[key];
          
          if (anim) {
            anim.scale.setValue(0.8); // 从0.8开始，更自然
            anim.opacity.setValue(0);
            
            Animated.parallel([
              Animated.spring(anim.scale, {
                toValue: 1,
                tension: 200,
                friction: 7,
                useNativeDriver: true,
              }),
              Animated.timing(anim.opacity, {
                toValue: 1,
                duration: 120,
                useNativeDriver: true,
              }),
            ]).start();
          }
        }
      }
    }
  };

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
              { 
                width: BOARD_SIZE, 
                height: BOARD_SIZE,
                transform: [{ translateX: animatedValues.current.board || new Animated.Value(0) }]
              }
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

            {/* Game tiles */}
            {boardStateRef.current.map((row, rowIndex) =>
              row.map((value, colIndex) => {
                if (!value) return null;

                const key = `${rowIndex}-${colIndex}`;
                const anim = animatedValues.current[key] || { scale: new Animated.Value(1), opacity: new Animated.Value(1) };
                
                return (
                  <Animated.View
                    key={key}
                    style={[
                      styles.tile,
                      getTileStyle(value),
                      {
                        width: TILE_SIZE,
                        height: TILE_SIZE,
                        left: pixelAlign(toX(colIndex)),
                        top: pixelAlign(toY(rowIndex)),
                        opacity: isAnimating ? 0 : anim.opacity,
                        transform: [{ scale: anim.scale }],
                        // 移动端性能优化
                        renderToHardwareTextureAndroid: true,
                        shouldRasterizeIOS: true,
                      },
                    ]}
                  >
                    <Text style={[styles.tileText, { fontSize: value > 512 ? 24 : 32 }]}>
                      {value}
                    </Text>
                  </Animated.View>
                );
              })
            )}

            {/* Ghost tiles overlay for sliding animation */}
            {isAnimating && (
              <View style={{ 
                position: 'absolute', 
                width: BOARD_SIZE, 
                height: BOARD_SIZE, 
                left: 0, 
                top: 0, 
                zIndex: 15,
                backgroundColor: 'transparent'
              }}>
                {ghostTilesRef.current.map(g => (
                  <Animated.View
                    key={`ghost-${g.key}`}
                    style={[
                      styles.tile,
                      getTileStyle(g.value),
                      {
                        width: TILE_SIZE,
                        height: TILE_SIZE,
                        transform: [
                          { translateX: g.anim.x }, 
                          { translateY: g.anim.y },
                          { scale: g.scale }
                        ],
                        // 移动端性能优化
                        renderToHardwareTextureAndroid: true,
                        shouldRasterizeIOS: true,
                      },
                    ]}
                  >
                    <Text style={[styles.tileText, { fontSize: g.value > 512 ? 24 : 32 }]}>{g.value}</Text>
                  </Animated.View>
                ))}
              </View>
            )}
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
    // 性能优化：减少动画期间的视觉效果
    elevation: Platform.OS === 'android' ? 2 : 0,
    shadowColor: Platform.OS === 'ios' ? '#000' : 'transparent',
    shadowOffset: Platform.OS === 'ios' ? { width: 0, height: 1 } : { width: 0, height: 0 },
    shadowOpacity: Platform.OS === 'ios' ? 0.1 : 0,
    shadowRadius: Platform.OS === 'ios' ? 2 : 0,
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