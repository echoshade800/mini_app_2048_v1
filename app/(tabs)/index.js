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
  const [isSliding, setIsSliding] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergingPositions, setMergingPositions] = useState(new Set());
  const movingRef = useRef(false);
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

  // 对合并落点做放大回弹；默认每段 100ms（0.1s）
  const animateMergeBounce = (mergeTargets, up = 1.12, dur = 100) => {
    return new Promise((resolve) => {
      if (!mergeTargets || mergeTargets.length === 0) return resolve();
      const anims = [];

      for (const { r, c } of mergeTargets) {
        const key = `${r}-${c}`;
        const av = animatedValues.current[key];
        if (!av) continue;

        // 停掉上一次动画，重置到 1
        av.scale.stopAnimation(() => {
          av.scale.setValue(1);
          anims.push(
            Animated.sequence([
              Animated.timing(av.scale, { toValue: up, duration: dur, useNativeDriver: true }),
              Animated.timing(av.scale, { toValue: 1,  duration: dur, useNativeDriver: true }),
            ])
          );
        });
      }

      if (anims.length === 0) return resolve();
      Animated.parallel(anims).start(() => resolve());
    });
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
    if (state.gameState !== 'playing' || state.isAnimating || movingRef.current) return;

    movingRef.current = true;

    const prev = state.board;
    const result = move(state.board, direction);
    
    if (!result.isValidMove) {
      // Invalid move - shake animation and haptic
      if (state.hapticsOn && Platform.OS !== 'web') {