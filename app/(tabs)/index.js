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
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGame } from '../../contexts/GameContext';
import {
  initializeBoard,
  move,
  addRandomTile,
  checkWin,
  checkGameOver,
  getHighestTile
} from '../../utils/GameLogic';

const { width: screenWidth } = Dimensions.get('window');
const BOARD_SIZE = Math.min(screenWidth - 40, 320);

// Unified grid constants
const GRID = 4;
const PADDING = 10;
const GAP = 10;
const INNER = BOARD_SIZE - PADDING * 2;
const TILE_SIZE = (INNER - GAP * (GRID + 1)) / GRID;

// Coordinate helpers
const toX = (c) => PADDING + GAP + c * (TILE_SIZE + GAP);
const toY = (r) => PADDING + GAP + r * (TILE_SIZE + GAP);

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
  const [isMerging, setIsMerging] = useState(false);
  const [mergingPositions, setMergingPositions] = useState(new Set());
  const animatedValues = useRef({});
  const ghostTilesRef = useRef([]);

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
    if (state.gameState !== 'playing' || state.isAnimating) return;

    const prev = state.board;
    const result = move(state.board, direction);
    
    if (!result.isValidMove) {
      // Invalid move - shake animation and haptic
      if (state.hapticsOn && Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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

    // Generate ghost tiles for sliding animation
    const transitions = computeTransitionsUIOnly(prev, result.board, direction)
      .filter(t => !(t.from.r === t.to.r && t.from.c === t.to.c));
    
    ghostTilesRef.current = transitions.map(t => ({
      key: `${t.from.r}-${t.from.c}`,
      value: prev[t.from.r][t.from.c],
      from: t.from,
      to: t.to,
      anim: new Animated.ValueXY({ x: toX(t.from.c), y: toY(t.from.r) }),
    }));

    // Set sliding state and animation lock AFTER ghost tiles are prepared
    setIsSliding(true);
    
    // Force a render cycle to ensure ghost tiles are ready before starting animation
    await new Promise(resolve => {
      requestAnimationFrame(resolve);
    });
    
    dispatch({ type: 'SET_ANIMATING', payload: true });

    // Update score
    const newScore = state.score + result.score;
    dispatch({ type: 'UPDATE_SCORE', payload: newScore });

    // Start sliding animation
    const slideAnims = ghostTilesRef.current.map(g =>
      Animated.timing(g.anim, {
        toValue: { x: toX(g.to.c), y: toY(g.to.r) },
        duration: 120,
        useNativeDriver: true,
      })
    );

    Animated.parallel(slideAnims).start(async () => {
      // 1) 计算本次"合并落点"——仅 UI 用
      const mergeTargets = computeMergeTargets(prev, direction);

      // 2) 提交"合并后的棋盘"（尚未生成新砖）
      dispatch({ type: 'SET_BOARD', payload: result.board });
      
      // 设置合并状态，隐藏合并位置的瓦片
      if (mergeTargets.length > 0) {
        const mergePositionKeys = new Set(mergeTargets.map(pos => `${pos.r}-${pos.c}`));
        setMergingPositions(mergePositionKeys);
        setIsMerging(true);
      }

      // 清除合并状态
      setIsMerging(false);
      setMergingPositions(new Set());

      // 3) 只对"合并落点"弹跳（每段 0.1s）
      await animateMergeBounce(mergeTargets, 1.12, 100);

      // 4) 生成新砖 & 只对"新增格子"弹入（沿用你已做好的 prev/next 对比）
      const boardWithNewTile = addRandomTile(result.board);
      dispatch({ type: 'SET_BOARD', payload: boardWithNewTile });
      animateNewTiles(result.board, boardWithNewTile);

      // Clear ghost tiles
      ghostTilesRef.current = [];
      setIsSliding(false);
      dispatch({ type: 'SET_ANIMATING', payload: false });

      setMoveCount(prev => prev + 1);

      // 5) 计分、胜负判定、haptics 等（保持你的原有顺序）
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    const colors = {
      2: { bg: '#eee4da', text: '#776e65' },
      4: { bg: '#ede0c8', text: '#776e65' },
      8: { bg: '#f2b179', text: '#f9f6f2' },
      16: { bg: '#f59563', text: '#f9f6f2' },
      32: { bg: '#f67c5f', text: '#f9f6f2' },
      64: { bg: '#f65e3b', text: '#f9f6f2' },
      128: { bg: '#edcf72', text: '#f9f6f2' },
      256: { bg: '#edcc61', text: '#f9f6f2' },
      512: { bg: '#edc850', text: '#f9f6f2' },
      1024: { bg: '#edc53f', text: '#f9f6f2' },
      2048: { bg: '#edc22e', text: '#f9f6f2' },
    };

    const color = colors[value] || { bg: '#3c3a32', text: '#f9f6f2' };
    
    return {
      backgroundColor: color.bg,
      color: color.text,
    };
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
              const r = Math.floor(i / GRID), c = i % GRID;
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
                const movingOldKey = `${rowIndex}-${colIndex}`;
                const isHidden = (isSliding && ghostTilesRef.current.some(g => g.key === movingOldKey)) ||
                                 (isMerging && mergingPositions.has(movingOldKey));

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

            {/* Ghost tiles overlay for sliding animation */}
            <View style={{ position: 'absolute', width: BOARD_SIZE, height: BOARD_SIZE, left: 0, top: 0, zIndex: 10 }}>
              {isSliding && ghostTilesRef.current.map(g => (
                <Animated.View
                  key={`ghost-${g.key}`}
                  style={[
                    styles.tile,
                    getTileStyle(g.value),
                    {
                      width: TILE_SIZE,
                      height: TILE_SIZE,
                      zIndex: 5,
                      transform: [{ translateX: g.anim.x }, { translateY: g.anim.y }],
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
            {Platform.OS === 'web' ? 'Use arrow keys or swipe to move' : 'Swipe in any direction to move tiles'}
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
    paddingHorizontal: 20,
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
    paddingVertical: 20,
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
    minWidth: 70,
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
    fontSize: 16,
    color: '#776e65',
    marginBottom: 8,
  },
  historyLink: {
    fontSize: 14,
    color: '#667eea',
    textDecorationLine: 'underline',
  },
  board: {
    backgroundColor: '#bbada0',
    borderRadius: 12,
    padding: PADDING,
    position: 'relative',
    marginBottom: 20,
  },
  gridCell: {
    backgroundColor: '#cdc1b4',
    borderRadius: 6,
    position: 'absolute',
  },
  tile: {
    borderRadius: 6,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tileText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  controls: {
    alignItems: 'center',
    paddingTop: 20,
  },
  controlsText: {
    fontSize: 14,
    color: '#8f7a66',
    textAlign: 'center',
  },
});