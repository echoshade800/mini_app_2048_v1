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
  const [isSliding, setIsSliding] = useState(false);
  const animatedValues = useRef({});
  const slideProgress = useRef(new Animated.Value(0)).current;
  const oldGhostsRef = useRef([]);
  const newGhostsRef = useRef([]);
  const hiddenPositionsRef = useRef(new Set());

  const SLIDE_MS = 160;

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

  // 计算合并组与相碰点
  const computeMergeGroups = (prevBoard, direction) => {
    const mergeGroups = [];
    const N = 4;

    const getPreMergePos = (dest, direction) => {
      switch (direction) {
        case 'left': return { r: dest.r, c: dest.c + 1 };
        case 'right': return { r: dest.r, c: dest.c - 1 };
        case 'up': return { r: dest.r + 1, c: dest.c };
        case 'down': return { r: dest.r - 1, c: dest.c };
        default: return dest;
      }
    };

    const processLine = (cells, isRow, fixedIndex) => {
      const nonEmpty = cells.filter(x => x.v !== null);
      let i = 0;
      let destIndex = 0;
      
      while (i < nonEmpty.length) {
        if (i + 1 < nonEmpty.length && nonEmpty[i].v === nonEmpty[i + 1].v) {
          // 合并发生
          let dest;
          if (isRow) {
            dest = direction === 'left' 
              ? { r: fixedIndex, c: destIndex }
              : { r: fixedIndex, c: N - 1 - destIndex };
          } else {
            dest = direction === 'up'
              ? { r: destIndex, c: fixedIndex }
              : { r: N - 1 - destIndex, c: fixedIndex };
          }
          
          const pre = getPreMergePos(dest, direction);
          
          mergeGroups.push({
            fromA: { r: nonEmpty[i].r, c: nonEmpty[i].c },
            fromB: { r: nonEmpty[i + 1].r, c: nonEmpty[i + 1].c },
            dest,
            pre,
            valueNew: nonEmpty[i].v * 2
          });
          
          destIndex++;
          i += 2;
        } else {
          destIndex++;
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
    
    return mergeGroups;
  };

  // 计算所有移动（包括非合并移动）
  const computeAllMoves = (prevBoard, nextBoard, direction) => {
    const moves = [];
    const N = 4;

    const processLine = (cells, isRow, fixedIndex) => {
      const nonEmpty = cells.filter(x => x.v !== null);
      const targets = [];
      let i = 0;
      
      while (i < nonEmpty.length) {
        if (i + 1 < nonEmpty.length && nonEmpty[i].v === nonEmpty[i + 1].v) {
          targets.push({ v: nonEmpty[i].v * 2, froms: [nonEmpty[i], nonEmpty[i + 1]] });
          i += 2;
        } else {
          targets.push({ v: nonEmpty[i].v, froms: [nonEmpty[i]] });
          i += 1;
        }
      }
      
      targets.forEach((t, idx) => {
        let destIndex = idx;
        if ((isRow && direction === 'right') || (!isRow && direction === 'down')) {
          destIndex = N - 1 - idx;
        }
        
        t.froms.forEach(src => {
          moves.push({
            from: { r: src.r, c: src.c },
            to: isRow
              ? { r: fixedIndex, c: destIndex }
              : { r: destIndex, c: fixedIndex },
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
    
    return moves.filter(m => !(m.from.r === m.to.r && m.from.c === m.to.c));
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
    if (state.gameState !== 'playing' || state.isAnimating) return;

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

    // 计算合并组和所有移动
    const mergeGroups = computeMergeGroups(prev, direction);
    const allMoves = computeAllMoves(prev, result.board, direction);
    
    // 构建旧幽灵（参与合并的瓦片）
    oldGhostsRef.current = [];
    newGhostsRef.current = [];
    hiddenPositionsRef.current = new Set();
    
    mergeGroups.forEach(group => {
      // 旧幽灵A: fromA -> pre
      oldGhostsRef.current.push({
        key: `old-${group.fromA.r}-${group.fromA.c}`,
        value: prev[group.fromA.r][group.fromA.c],
        from: group.fromA,
        to: group.pre,
        animX: slideProgress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [toX(group.fromA.c), toX(group.pre.c), toX(group.pre.c)],
          extrapolate: 'clamp'
        }),
        animY: slideProgress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [toY(group.fromA.r), toY(group.pre.r), toY(group.pre.r)],
          extrapolate: 'clamp'
        }),
        animOpacity: slideProgress.interpolate({
          inputRange: [0, 0.49, 0.5],
          outputRange: [1, 1, 0],
          extrapolate: 'clamp'
        })
      });
      
      // 旧幽灵B: fromB -> pre
      oldGhostsRef.current.push({
        key: `old-${group.fromB.r}-${group.fromB.c}`,
        value: prev[group.fromB.r][group.fromB.c],
        from: group.fromB,
        to: group.pre,
        animX: slideProgress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [toX(group.fromB.c), toX(group.pre.c), toX(group.pre.c)],
          extrapolate: 'clamp'
        }),
        animY: slideProgress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [toY(group.fromB.r), toY(group.pre.r), toY(group.pre.r)],
          extrapolate: 'clamp'
        }),
        animOpacity: slideProgress.interpolate({
          inputRange: [0, 0.49, 0.5],
          outputRange: [1, 1, 0],
          extrapolate: 'clamp'
        })
      });
      
      // 新幽灵: pre -> dest
      newGhostsRef.current.push({
        key: `new-${group.dest.r}-${group.dest.c}`,
        value: group.valueNew,
        from: group.pre,
        to: group.dest,
        animX: slideProgress.interpolate({
          inputRange: [0.25, 1],
          outputRange: [toX(group.pre.c), toX(group.dest.c)],
          extrapolate: 'clamp'
        }),
        animY: slideProgress.interpolate({
          inputRange: [0.25, 1],
          outputRange: [toY(group.pre.r), toY(group.dest.r)],
          extrapolate: 'clamp'
        }),
        animOpacity: slideProgress.interpolate({
          inputRange: [0.25, 0.40],
          outputRange: [0, 1],
          extrapolate: 'clamp'
        }),
        animScale: slideProgress.interpolate({
          inputRange: [0.90, 0.95, 1.0],
          outputRange: [1.0, 1.12, 1.0],
          extrapolate: 'clamp'
        })
      });
      
      // 标记需要隐藏的位置
      hiddenPositionsRef.current.add(`${group.fromA.r}-${group.fromA.c}`);
      hiddenPositionsRef.current.add(`${group.fromB.r}-${group.fromB.c}`);
    });
    
    // 添加非合并移动的幽灵
    allMoves.forEach(move => {
      const isPartOfMerge = mergeGroups.some(group => 
        (group.fromA.r === move.from.r && group.fromA.c === move.from.c) ||
        (group.fromB.r === move.from.r && group.fromB.c === move.from.c)
      );
      
      if (!isPartOfMerge) {
        oldGhostsRef.current.push({
          key: `move-${move.from.r}-${move.from.c}`,
          value: move.value,
          from: move.from,
          to: move.to,
          animX: slideProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [toX(move.from.c), toX(move.to.c)],
            extrapolate: 'clamp'
          }),
          animY: slideProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [toY(move.from.r), toY(move.to.r)],
            extrapolate: 'clamp'
          }),
          animOpacity: slideProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1],
            extrapolate: 'clamp'
          })
        });
        
        hiddenPositionsRef.current.add(`${move.from.r}-${move.from.c}`);
      }
    });

    // 锁定输入和设置滑动状态
    setIsSliding(true);
    dispatch({ type: 'SET_ANIMATING', payload: true });

    // Update score
    const newScore = state.score + result.score;
    dispatch({ type: 'UPDATE_SCORE', payload: newScore });

    // 等待一帧确保幽灵准备就绪
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // 开始统一的进度动画
    slideProgress.setValue(0);
    
    // 在90%进度时生成新砖
    const newTileTimer = setTimeout(async () => {
      const boardWithNewTile = addRandomTile(result.board);
      dispatch({ type: 'SET_BOARD', payload: boardWithNewTile });
      animateNewTiles(result.board, boardWithNewTile);
    }, SLIDE_MS * 0.9);
    
    Animated.timing(slideProgress, {
      toValue: 1,
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start(async () => {
      clearTimeout(newTileTimer);
      
      // 确保最终状态正确
      const boardWithNewTile = addRandomTile(result.board);
      dispatch({ type: 'SET_BOARD', payload: boardWithNewTile });

      // 清理状态
      oldGhostsRef.current = [];
      newGhostsRef.current = [];
      hiddenPositionsRef.current = new Set();
      setIsSliding(false);
      dispatch({ type: 'SET_ANIMATING', payload: false });

      setMoveCount(prev => prev + 1);

      // 胜负判定
      // Check win condition
      if (checkWin(boardWithNewTile) && state.gameState === 'playing') {
        dispatch({ type: 'SET_GAME_STATE', payload: 'won' });
        showWinModal();
      } else if (checkGameOver(boardWithNewTile)) {
        dispatch({ type: 'SET_GAME_STATE', payload: 'lost' });
        await endGame(boardWithNewTile, newScore, false);
        showLoseModal();
      }

      // Haptic feedback for valid move
      if (state.hapticsOn && Platform.OS !== 'web') {
        if (Haptics) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    });
  }, [state.gameState, state.isAnimating, state.board, state.score, dispatch, saveGameData, state.hapticsOn, state.currentGame, state.maxLevel, state.maxScore, state.maxTime, state.gameHistory, moveCount, gameStartTime]);

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

  const animateNewTiles = (prevBoard, nextBoard) => {
    // Find new tiles and animate them
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (nextBoard[row][col] && !prevBoard[row][col]) {
          const key = `${row}-${col}`;
          const anim = animatedValues.current[key];
          
          if (anim) {
            anim.scale.setValue(0);
            anim.opacity.setValue(0);
            
            Animated.parallel([
              Animated.spring(anim.scale, {
                toValue: 1,
                tension: 200,
                friction: 10,
                useNativeDriver: true,
              }),
              Animated.timing(anim.opacity, {
                toValue: 1,
                duration: 200,
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

  const getTileFontSize = (value) => {
    if (value < 100) return 55;
    if (value < 1000) return 45;
    if (value < 10000) return 35;
    return 30;
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
            {state.board.map((row, rowIndex) =>
              row.map((value, colIndex) => {
                if (!value) return null;

                const key = `${rowIndex}-${colIndex}`;
                const anim = animatedValues.current[key] || { scale: new Animated.Value(1), opacity: new Animated.Value(1) };
                const isHidden = isSliding && hiddenPositionsRef.current.has(key);

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
                        opacity: isHidden ? 0 : anim.opacity,
                        zIndex: isHidden ? -1 : 1,
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

            {/* 旧幽灵层 */}
            <View style={{ position: 'absolute', width: BOARD_SIZE, height: BOARD_SIZE, left: 0, top: 0, zIndex: 10 }}>
              {isSliding && oldGhostsRef.current.map(g => (
                <Animated.View
                  key={g.key}
                  style={[
                    styles.tile,
                    getTileStyle(g.value),
                    {
                      width: TILE_SIZE,
                      height: TILE_SIZE,
                      zIndex: 5,
                      opacity: g.animOpacity,
                      transform: [
                        { translateX: g.animX },
                        { translateY: g.animY }
                      ],
                    },
                  ]}
                >
                  <Text style={[styles.tileText, { fontSize: g.value > 512 ? 24 : 32 }]}>{g.value}</Text>
                </Animated.View>
              ))}
              
              {/* 新幽灵层 */}
              {isSliding && newGhostsRef.current.map(g => (
                <Animated.View
                  key={g.key}
                  style={[
                    styles.tile,
                    getTileStyle(g.value),
                    {
                      width: TILE_SIZE,
                      height: TILE_SIZE,
                      zIndex: 6,
                      opacity: g.animOpacity,
                      transform: [
                        { translateX: g.animX },
                        { translateY: g.animY },
                        { scale: g.animScale }
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