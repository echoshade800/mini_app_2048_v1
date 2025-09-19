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
  const [animationPhase, setAnimationPhase] = useState('idle'); // 'idle', 'animating'
  const animatedValues = useRef({});
  const ghostTilesRef = useRef([]);
  const masterTimeline = useRef(new Animated.Value(0));

  // 用 ref 跟踪最新的 isAnimating 状态，确保手势处理器能获取到最新值
  const isAnimatingRef = useRef(state.isAnimating);
  useEffect(() => {
    isAnimatingRef.current = state.isAnimating;
  }, [state.isAnimating]);

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
    if (state.board.every(row => row.every(cell => cell === null))) {
      startNewGame();
    }
  }, [state.isLoading, state.showOnboarding]);

  // Keyboard controls for web
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyPress = (event) => {
      if (state.isAnimating) return;
      
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
  }, [state.isAnimating, state.board]);

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

    // Animate new tiles
    animateNewTiles(createEmptyBoard(), newBoard);
  };

  const createEmptyBoard = () => {
    return Array(4).fill(null).map(() => Array(4).fill(null));
  };

  const handleMove = useCallback(async (direction) => {
    if (state.gameState !== 'playing' || animationPhase !== 'idle') return;

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

    // 1. 准备幽灵瓦片和合并数据
    const transitions = computeTransitionsUIOnly(prev, result.board, direction)
      .filter(t => !(t.from.r === t.to.r && t.from.c === t.to.c));
    
    const mergeTargets = computeMergeTargets(prev, direction);
    
    // 2. 设置动画状态
    setAnimationPhase('animating');
    dispatch({ type: 'SET_ANIMATING', payload: true });
    
    // 3. 隐藏将要移动的真实瓦片（只用 opacity）
    const movingPositions = new Set(transitions.map(t => `${t.from.r}-${t.from.c}`));
    for (const posKey of movingPositions) {
      const anim = animatedValues.current[posKey];
      if (anim) {
        anim.opacity.setValue(0);
      }
    }
    
    ghostTilesRef.current = transitions.map(t => ({
      key: `${t.from.r}-${t.from.c}`,
      value: prev[t.from.r][t.from.c],
      from: t.from,
      to: t.to,
      anim: new Animated.ValueXY({ x: toX(t.from.c), y: toY(t.from.r) }),
      scale: new Animated.Value(1),
    }));

    // 4. 更新分数（但不提交棋盘）
    const newScore = state.score + result.score;
    dispatch({ type: 'UPDATE_SCORE', payload: newScore });
    
    // 如果新分数超过最佳分数，立即保存
    if (newScore > state.bestScore) {
      saveGameData({ maxScore: newScore });
    }

    // 检查并更新最高瓦片值
    // const currentHighestTile = getHighestTile(boardWithNewTile);
    // if (currentHighestTile > state.maxLevel) {
    //   dispatch({ type: 'UPDATE_STATS', payload: { maxLevel: currentHighestTile } });
    // }

    // 5. 统一时间线动画
    masterTimeline.current.setValue(0);
    
    const slideAnims = ghostTilesRef.current.map(g => 
      Animated.timing(g.anim, {
        toValue: { x: toX(g.to.c), y: toY(g.to.r) },
        duration: 200,
        useNativeDriver: true,
      })
    );
    
    // 合并位置的幽灵瓦片做放大回弹
    const mergeAnims = ghostTilesRef.current
      .filter(g => mergeTargets.some(mt => mt.r === g.to.r && mt.c === g.to.c))
      .map(g => 
        Animated.sequence([
          Animated.delay(120), // 滑动完成后开始
          Animated.timing(g.scale, {
            toValue: 1.2,
            duration: 60,
            useNativeDriver: true,
          }),
          Animated.timing(g.scale, {
            toValue: 1,
            duration: 60,
            useNativeDriver: true,
          }),
        ])
      );

    // 6. 执行所有动画
    Animated.parallel([
      ...slideAnims,
      ...mergeAnims,
    ]).start(async () => {
      // 7. 动画完成后直接生成新瓦片并一次性提交棋盘，避免中间状态闪烁
      const boardWithoutNewTile = result.board;
      const boardWithNewTile = addRandomTile(boardWithoutNewTile);
      dispatch({ type: 'SET_BOARD', payload: boardWithNewTile });
      animateNewTiles(boardWithoutNewTile, boardWithNewTile);

      // 在下一帧清理幽灵瓦片并恢复可见性，避免提交新棋盘与清理不同步导致的闪回
      requestAnimationFrame(() => {
        ghostTilesRef.current = [];
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 4; col++) {
            const key = `${row}-${col}`;
            const anim = animatedValues.current[key];
            if (anim) {
              anim.opacity.setValue(1);
              anim.scale.setValue(1);
            }
          }
        }

        // 10. 重置动画状态
        setAnimationPhase('idle');
        dispatch({ type: 'SET_ANIMATING', payload: false });

        setMoveCount(prev => prev + 1);

        // 11. 胜负判定和触觉反馈
        if (checkWin(boardWithNewTile) && state.gameState === 'playing' && !state.hasWon) {
          dispatch({ type: 'SET_GAME_STATE', payload: 'won' });
          dispatch({ type: 'SET_HAS_WON', payload: true });
          
          // 记录达到2048的时间（Fastest Win）
          const winTime = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0;
          if (winTime > 0 && (state.maxTime === 0 || winTime < state.maxTime)) {
            dispatch({ type: 'UPDATE_STATS', payload: { maxTime: winTime } });
          }
          
          showWinModal();
        } else if (checkGameOver(boardWithNewTile)) {
          dispatch({ type: 'SET_GAME_STATE', payload: 'lost' });
          // 如果玩家已经达到过2048，即使游戏结束也记录为成功
          const gameWon = state.hasWon;
          endGame(boardWithNewTile, newScore, gameWon).then(() => {
            if (gameWon) {
              showVictoryEndModal();
            } else {
              showLoseModal();
            }
          });
        }

        if (state.hapticsOn && Platform.OS !== 'web') {
          if (Haptics) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      });
    });
  }, [animationPhase, state.gameState, state.board, state.score, dispatch, saveGameData, state.hapticsOn, state.currentGame, state.maxLevel, state.maxScore, state.maxTime, state.gameHistory, moveCount, gameStartTime]);

  // 用 useMemo 重建 PanResponder，避免旧值问题
  const panResponder = useMemo(() => {
    const isAnimating = () => animationPhase !== 'idle';
    
    return PanResponder.create({
    // 尝试尽早接管（动画时不接管）
    onStartShouldSetPanResponder: () => !isAnimating(),
    onMoveShouldSetPanResponder: (_evt, g) => {
      if (isAnimating()) return false;
      const { dx, dy } = g;
      const THRESHOLD = 20; // 统一阈值
      return Math.abs(dx) > THRESHOLD || Math.abs(dy) > THRESHOLD;
    },
    // 有子元素（按钮/文字）时，capture 有助于父级接管
    onStartShouldSetPanResponderCapture: () => !isAnimating(),
    onMoveShouldSetPanResponderCapture: (_evt, g) => {
      if (isAnimating()) return false;
      const { dx, dy } = g;
      const THRESHOLD = 20;
      return Math.abs(dx) > THRESHOLD || Math.abs(dy) > THRESHOLD;
    },
    onPanResponderRelease: (_evt, g) => {
      if (isAnimating()) return;
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
  }, [handleMove, animationPhase]);

  const animateNewTiles = (prevBoard, nextBoard) => {
    // Find new tiles and animate them
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (nextBoard[row][col] && !prevBoard[row][col]) {
          const key = `${row}-${col}`;
          const anim = animatedValues.current[key];
          
          if (anim) {
            anim.scale.setValue(0.6); // 从0.6开始，更自然
            anim.opacity.setValue(0);
            
            Animated.parallel([
              Animated.spring(anim.scale, {
                toValue: 1,
                tension: 300,
                friction: 8,
                useNativeDriver: true,
              }),
              Animated.timing(anim.opacity, {
                toValue: 1,
                duration: 150,
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
      // maxTime 已经在达到2048时记录，这里不需要再次计算
      maxTime: state.maxTime,
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

  const showVictoryEndModal = () => {
    Alert.alert(
      '🏆 Victory Complete!',
      `Congratulations! You achieved 2048 and played until the end!\n\nFinal Score: ${state.score}\nHighest Tile: ${getHighestTile(state.board)}\n\nThis game is recorded as a victory!`,
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

  if (state.isLoading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
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

        <View style={{ position: 'relative', alignSelf: 'center' }}>
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
            {state.board.map((row, rowIndex) =>
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
                        left: toX(colIndex),
                        top: toY(rowIndex),
                        opacity: anim.opacity,
                        transform: [{ scale: anim.scale }],
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
            <View style={{ position: 'absolute', width: BOARD_SIZE, height: BOARD_SIZE, left: 0, top: 0, zIndex: 15 }}>
              {animationPhase === 'animating' && ghostTilesRef.current.map(g => (
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
                    },
                  ]}
                >
                  <Text style={[styles.tileText, { fontSize: g.value > 512 ? 24 : 32 }]}>{g.value}</Text>
                </Animated.View>
              ))}
            </View>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#faf8ef',
  },
  container: {
    flex: 1,
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