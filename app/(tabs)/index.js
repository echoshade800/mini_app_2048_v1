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

// Unified sizing and positioning constants
const GRID = 4;
const PADDING = 10;  // Align with styles.board padding
const GAP = 10;      // Gap between cells
const INNER = BOARD_SIZE - PADDING * 2;
const TILE_SIZE = (INNER - GAP * (GRID + 1)) / GRID;

// Unified coordinate calculation
const toX = (col) => PADDING + GAP + col * (TILE_SIZE + GAP);
const toY = (row) => PADDING + GAP + row * (TILE_SIZE + GAP);

/**
 * Home Screen - Main Game Board
 * Purpose: Play 2048 + quick actions (score, best, new game)
 * Features: 4x4 board, swipe gestures, keyboard controls, animations
 */
export default function HomeScreen() {
  const { state, dispatch, saveGameData } = useGame();
  const [gameStartTime, setGameStartTime] = useState(null);
  const [moveCount, setMoveCount] = useState(0);
  const animatedValues = useRef({});
  const posAnimsRef = useRef({});

  // 用 ref 跟踪最新的 isAnimating 状态，确保手势处理器能获取到最新值
  const isAnimatingRef = useRef(state.isAnimating);
  useEffect(() => {
    isAnimatingRef.current = state.isAnimating;
  }, [state.isAnimating]);

  // Helper functions for coordinate conversion
  // Compute transitions for UI animation (does not change game logic)
  const computeTransitionsUIOnly = (beforeBoard, afterBoard, direction) => {
    const transitions = [];
    
    // Create a map of values in the after board for matching
    const afterPositions = {};
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (afterBoard[r][c] !== null) {
          const key = `${r}-${c}`;
          afterPositions[key] = afterBoard[r][c];
        }
      }
    }
    
    // For each non-null tile in before board, find where it should move
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (beforeBoard[r][c] !== null) {
          const value = beforeBoard[r][c];
          
          // Find target position based on direction and game logic
          let targetR = r, targetC = c;
          
          if (direction === 'left') {
            // Find leftmost available position
            for (let newC = 0; newC < 4; newC++) {
              if (afterBoard[r][newC] === value) {
                targetC = newC;
                break;
              }
            }
          } else if (direction === 'right') {
            // Find rightmost available position
            for (let newC = 3; newC >= 0; newC--) {
              if (afterBoard[r][newC] === value) {
                targetC = newC;
                break;
              }
            }
          } else if (direction === 'up') {
            // Find topmost available position
            for (let newR = 0; newR < 4; newR++) {
              if (afterBoard[newR][c] === value) {
                targetR = newR;
                break;
              }
            }
          } else if (direction === 'down') {
            // Find bottommost available position
            for (let newR = 3; newR >= 0; newR--) {
              if (afterBoard[newR][c] === value) {
                targetR = newR;
                break;
              }
            }
          }
          
          // Only add transition if position actually changed
          if (targetR !== r || targetC !== c) {
            transitions.push({
              from: { r, c },
              to: { r: targetR, c: targetC }
            });
          }
        }
      }
    }
    
    return transitions;
  };
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
      setTimeout(() => {
        startNewGame();
      }, 0);
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
    animateNewTiles(newBoard);
  };

  const handleMove = useCallback(async (direction) => {
    if (state.gameState !== 'playing' || isAnimatingRef.current) return;

    const beforeBoard = state.board;
    const result = move(beforeBoard, direction);
    
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

    dispatch({ type: 'SET_ANIMATING', payload: true });

    // 1) Compute transitions for UI animation
    const transitions = computeTransitionsUIOnly(beforeBoard, result.board, direction);

    // 2) Animate tiles to their target positions
    const anims = [];
    for (const t of transitions) {
      const oldKey = `${t.from.r}-${t.from.c}`;
      const pos = posAnimsRef.current[oldKey];
      if (pos) {
        anims.push(Animated.timing(pos, {
          toValue: { x: toX(t.to.c), y: toY(t.to.r) },
          duration: 120,
          useNativeDriver: true,
        }));
      }
    }

    // Haptic feedback for valid move
    if (state.hapticsOn && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.parallel(anims).start(async () => {
      // 3) Animation finished - commit new board state
      dispatch({ type: 'SET_BOARD', payload: result.board });

      // 4) Update score
      const newScore = state.score + result.score;
      dispatch({ type: 'UPDATE_SCORE', payload: newScore });

      // 5) Animate merges (bounce effect)
      await animateMerges();

      // 6) Add new tile and animate it
      const boardWithNewTile = addRandomTile(result.board);
      dispatch({ type: 'SET_BOARD', payload: boardWithNewTile });
      animateNewTiles(boardWithNewTile);

      setMoveCount(prev => prev + 1);

      // 7) Check win/lose conditions
      if (checkWin(boardWithNewTile) && state.gameState === 'playing') {
        dispatch({ type: 'SET_GAME_STATE', payload: 'won' });
        showWinModal();
      } else if (checkGameOver(boardWithNewTile)) {
        dispatch({ type: 'SET_GAME_STATE', payload: 'lost' });
        await endGame(boardWithNewTile, newScore, false);
        showLoseModal();
      }

      dispatch({ type: 'SET_ANIMATING', payload: false });
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

  const animateMerges = () => {
    return new Promise(resolve => {
      // Animate merge effects
      const animations = [];
      
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const key = `${row}-${col}`;
          const anim = animatedValues.current[key];
          
          if (anim) {
            animations.push(
              Animated.sequence([
                Animated.timing(anim.scale, {
                  toValue: 1.1,
                  duration: 100,
                  useNativeDriver: true,
                }),
                Animated.timing(anim.scale, {
                  toValue: 1,
                  duration: 100,
                  useNativeDriver: true,
                }),
              ])
            );
          }
        }
      }
      
      Animated.parallel(animations).start(() => resolve());
    });
  };

  const animateNewTiles = (board) => {
    // Find new tiles and animate them
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (board[row][col] && !state.board[row][col]) {
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
              const row = Math.floor(i / GRID), col = i % GRID;
              return (
                <View
                  key={i}
                  style={[
                    styles.gridCell,
                    { width: TILE_SIZE, height: TILE_SIZE, left: toX(col), top: toY(row) }
                  ]}
                />
              );
            })}

            {/* Game tiles */}
            {state.board.map((row, rowIndex) =>
              row.map((value, colIndex) => {
                if (!value) return null;

                const key = `${rowIndex}-${colIndex}`;
                
                // Ensure position animator exists
                if (!posAnimsRef.current[key]) {
                  posAnimsRef.current[key] = new Animated.ValueXY({ 
                    x: toX(colIndex), 
                    y: toY(rowIndex) 
                  });
                } else {
                  // Keep animator in sync if layout changed
                  posAnimsRef.current[key].setValue({ 
                    x: toX(colIndex), 
                    y: toY(rowIndex) 
                  });
                }
                
                const anim = animatedValues.current[key] || { scale: new Animated.Value(1), opacity: new Animated.Value(1) };
                const pos = posAnimsRef.current[key];

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
                        transform: [
                          { scale: anim.scale }
                        ],
                        opacity: anim.opacity,
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
    padding: 10,
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