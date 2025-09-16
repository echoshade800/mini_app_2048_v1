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

// Animation constants (matching original 2048)
const ANIMATION_DURATION = 200;
const APPEAR_DURATION = 150;
const POP_DURATION = 120;
const CELL_SIZE = Math.floor((BOARD_SIZE - 50) / 4); // 4x4 grid with spacing
const CELL_SPACING = 10;

// Position calculation helpers
const cellPosition = (index) => {
  return CELL_SPACING + index * (CELL_SIZE + CELL_SPACING);
};

const toX = (col) => cellPosition(col);
const toY = (row) => cellPosition(row);

// Tile class to match original structure
class Tile {
  constructor(position, value) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.x = position.x;
    this.y = position.y;
    this.value = value;
    this.previousPosition = null;
    this.mergedFrom = null;
  }

  savePosition() {
    this.previousPosition = { x: this.x, y: this.y };
  }

  updatePosition(position) {
    this.x = position.x;
    this.y = position.y;
  }
}

// Grid class to manage tiles
class Grid {
  constructor(size = 4) {
    this.size = size;
    this.cells = this.empty();
  }

  empty() {
    const cells = [];
    for (let x = 0; x < this.size; x++) {
      const row = cells[x] = [];
      for (let y = 0; y < this.size; y++) {
        row.push(null);
      }
    }
    return cells;
  }

  insertTile(tile) {
    this.cells[tile.x][tile.y] = tile;
  }

  removeTile(tile) {
    this.cells[tile.x][tile.y] = null;
  }

  cellContent(cell) {
    return this.cells[cell.x][cell.y];
  }

  cellAvailable(cell) {
    return !this.cellOccupied(cell);
  }

  cellOccupied(cell) {
    return !!this.cellContent(cell);
  }

  cellsAvailable() {
    return !!this.availableCells().length;
  }

  availableCells() {
    const cells = [];
    this.eachCell((x, y, tile) => {
      if (!tile) {
        cells.push({ x, y });
      }
    });
    return cells;
  }

  eachCell(callback) {
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        callback(x, y, this.cells[x][y]);
      }
    }
  }

  serialize() {
    const cellState = [];
    for (let x = 0; x < this.size; x++) {
      const row = cellState[x] = [];
      for (let y = 0; y < this.size; y++) {
        row.push(this.cells[x][y] ? this.cells[x][y].value : null);
      }
    }
    return cellState;
  }
}

/**
 * Home Screen - Main Game Board with Original 2048 Animation System
 */
export default function HomeScreen() {
  const { state, dispatch, saveGameData } = useGame();
  const [gameStartTime, setGameStartTime] = useState(null);
  const [moveCount, setMoveCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Game state
  const gridRef = useRef(new Grid(4));
  const [tiles, setTiles] = useState([]);
  const [score, setScore] = useState(0);
  
  // Animation refs
  const tileAnimations = useRef({});
  const isAnimatingRef = useRef(false);

  // Direction vectors
  const directions = {
    up: { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }
  };

  // Initialize animations for a tile
  const initializeTileAnimation = (tileId) => {
    if (!tileAnimations.current[tileId]) {
      tileAnimations.current[tileId] = {
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        scale: new Animated.Value(1),
        opacity: new Animated.Value(1),
      };
    }
    return tileAnimations.current[tileId];
  };

  // Get tile style with original 2048 colors
  const getTileStyle = (value) => {
    const tileColors = {
      2: { backgroundColor: '#eee4da', color: '#776e65' },
      4: { backgroundColor: '#ede0c8', color: '#776e65' },
      8: { backgroundColor: '#f2b179', color: '#f9f6f2' },
      16: { backgroundColor: '#f59563', color: '#f9f6f2' },
      32: { backgroundColor: '#f67c5f', color: '#f9f6f2' },
      64: { backgroundColor: '#f65e3b', color: '#f9f6f2' },
      128: { backgroundColor: '#edcf72', color: '#f9f6f2' },
      256: { backgroundColor: '#edcc61', color: '#f9f6f2' },
      512: { backgroundColor: '#edc850', color: '#f9f6f2' },
      1024: { backgroundColor: '#edc53f', color: '#f9f6f2' },
      2048: { backgroundColor: '#edc22e', color: '#f9f6f2' },
      4096: { backgroundColor: '#3c3a32', color: '#f9f6f2' },
      8192: { backgroundColor: '#3c3a32', color: '#f9f6f2' },
    };

    return tileColors[value] || { 
      backgroundColor: '#3c3a32', 
      color: '#f9f6f2'
    };
  };

  const getTileFontSize = (value) => {
    if (value < 100) return 32;
    if (value < 1000) return 28;
    if (value < 10000) return 24;
    return 20;
  };

  // Initialize game
  const initializeGame = () => {
    const grid = new Grid(4);
    gridRef.current = grid;
    
    // Add two initial tiles
    addRandomTile(grid);
    addRandomTile(grid);
    
    updateTilesFromGrid();
    setScore(0);
    setMoveCount(0);
    setGameStartTime(Date.now());
  };

  // Add random tile to grid
  const addRandomTile = (grid) => {
    if (grid.cellsAvailable()) {
      const value = Math.random() < 0.9 ? 2 : 4;
      const availableCells = grid.availableCells();
      const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
      const tile = new Tile(randomCell, value);
      grid.insertTile(tile);
    }
  };

  // Update tiles state from grid
  const updateTilesFromGrid = () => {
    const newTiles = [];
    gridRef.current.eachCell((x, y, tile) => {
      if (tile) {
        newTiles.push(tile);
      }
    });
    setTiles(newTiles);
  };

  // Get vector for direction
  const getVector = (direction) => {
    return directions[direction];
  };

  // Build traversals for direction
  const buildTraversals = (vector) => {
    const traversals = { x: [], y: [] };

    for (let pos = 0; pos < 4; pos++) {
      traversals.x.push(pos);
      traversals.y.push(pos);
    }

    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
  };

  // Find farthest position
  const findFarthestPosition = (cell, vector) => {
    let previous;

    // Progress towards the vector direction until an obstacle is found
    do {
      previous = cell;
      cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (cell.x >= 0 && cell.x < 4 && cell.y >= 0 && cell.y < 4 &&
             gridRef.current.cellAvailable(cell));

    return {
      farthest: previous,
      next: cell // Used to check if a merge is required
    };
  };

  // Check if tiles can merge
  const tileMatchesAvailable = () => {
    const grid = gridRef.current;
    
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        const tile = grid.cellContent({ x, y });
        
        if (tile) {
          for (let direction in directions) {
            const vector = getVector(direction);
            const cell = { x: x + vector.x, y: y + vector.y };
            
            if (cell.x >= 0 && cell.x < 4 && cell.y >= 0 && cell.y < 4) {
              const other = grid.cellContent(cell);
              if (other && other.value === tile.value) {
                return true;
              }
            }
          }
        }
      }
    }
    
    return false;
  };

  // Check if moves are available
  const movesAvailable = () => {
    return gridRef.current.cellsAvailable() || tileMatchesAvailable();
  };

  // Animate tile appearance
  const animateTileAppear = (tile) => {
    const anim = initializeTileAnimation(tile.id);
    
    // Start from invisible and small
    anim.opacity.setValue(0);
    anim.scale.setValue(0);
    
    // Animate to visible and normal size
    Animated.parallel([
      Animated.timing(anim.opacity, {
        toValue: 1,
        duration: APPEAR_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(anim.scale, {
        toValue: 1,
        duration: APPEAR_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Animate tile pop (merge bounce)
  const animateTilePop = (tile) => {
    const anim = initializeTileAnimation(tile.id);
    
    Animated.sequence([
      Animated.timing(anim.scale, {
        toValue: 1.1,
        duration: POP_DURATION / 2,
        useNativeDriver: true,
      }),
      Animated.timing(anim.scale, {
        toValue: 1,
        duration: POP_DURATION / 2,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Animate tile movement
  const animateTileMovement = (tile, callback) => {
    const anim = initializeTileAnimation(tile.id);
    
    if (tile.previousPosition) {
      // Set initial position
      anim.translateX.setValue(toX(tile.previousPosition.y) - toX(tile.y));
      anim.translateY.setValue(toY(tile.previousPosition.x) - toY(tile.x));
      
      // Animate to final position
      Animated.parallel([
        Animated.timing(anim.translateX, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start(callback);
    } else if (callback) {
      callback();
    }
  };

  // Main move function
  const handleMove = useCallback((direction) => {
    if (isAnimatingRef.current || !movesAvailable()) {
      return;
    }

    isAnimatingRef.current = true;
    setIsAnimating(true);

    const grid = gridRef.current;
    const vector = getVector(direction);
    const traversals = buildTraversals(vector);
    let moved = false;
    let scoreIncrease = 0;
    const mergedTiles = [];

    // Save the current state
    grid.eachCell((x, y, tile) => {
      if (tile) {
        tile.mergedFrom = null;
        tile.savePosition();
      }
    });

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach((x) => {
      traversals.y.forEach((y) => {
        const cell = { x, y };
        const tile = grid.cellContent(cell);

        if (tile) {
          const positions = findFarthestPosition(cell, vector);
          const next = (positions.next.x >= 0 && positions.next.x < 4 && 
                       positions.next.y >= 0 && positions.next.y < 4) 
                       ? grid.cellContent(positions.next) : null;

          // Only one merger per row traversal?
          if (next && next.value === tile.value && !next.mergedFrom) {
            const merged = new Tile(positions.next, tile.value * 2);
            merged.mergedFrom = [tile, next];

            grid.insertTile(merged);
            grid.removeTile(tile);

            // Converge the two tiles' positions
            tile.updatePosition(positions.next);

            // Update the score
            scoreIncrease += merged.value;
            mergedTiles.push(merged);

            moved = true;
          } else {
            // Move tile to farthest position
            if (positions.farthest.x !== tile.x || positions.farthest.y !== tile.y) {
              grid.removeTile(tile);
              tile.updatePosition(positions.farthest);
              grid.insertTile(tile);
              moved = true;
            }
          }
        }
      });
    });

    if (moved) {
      // Update score
      setScore(prev => prev + scoreIncrease);
      setMoveCount(prev => prev + 1);

      // Update tiles and animate
      updateTilesFromGrid();

      // Animate all moving tiles
      const animationPromises = [];
      
      tiles.forEach(tile => {
        if (tile.previousPosition && 
            (tile.previousPosition.x !== tile.x || tile.previousPosition.y !== tile.y)) {
          animationPromises.push(new Promise(resolve => {
            animateTileMovement(tile, resolve);
          }));
        }
      });

      // Wait for all movement animations to complete
      Promise.all(animationPromises).then(() => {
        // Add new random tile
        addRandomTile(grid);
        updateTilesFromGrid();

        // Find and animate new tiles
        const newTiles = [];
        grid.eachCell((x, y, tile) => {
          if (tile && !tile.previousPosition) {
            newTiles.push(tile);
          }
        });

        newTiles.forEach(tile => {
          animateTileAppear(tile);
        });

        // Animate merged tiles pop
        mergedTiles.forEach(tile => {
          setTimeout(() => {
            animateTilePop(tile);
          }, 50);
        });

        // Check game state
        setTimeout(() => {
          if (checkWin(grid.serialize()) && state.gameState === 'playing') {
            dispatch({ type: 'SET_GAME_STATE', payload: 'won' });
            showWinModal();
          } else if (!movesAvailable()) {
            dispatch({ type: 'SET_GAME_STATE', payload: 'lost' });
            showLoseModal();
          }

          isAnimatingRef.current = false;
          setIsAnimating(false);
        }, APPEAR_DURATION + 100);
      });

      // Haptic feedback
      if (state.hapticsOn && Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      // Invalid move - shake animation
      if (state.hapticsOn && Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      isAnimatingRef.current = false;
      setIsAnimating(false);
    }
  }, [tiles, state.gameState, state.hapticsOn, dispatch]);

  // Pan responder for gestures
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !isAnimatingRef.current,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      if (isAnimatingRef.current) return false;
      const { dx, dy } = gestureState;
      const THRESHOLD = 20;
      return Math.abs(dx) > THRESHOLD || Math.abs(dy) > THRESHOLD;
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (isAnimatingRef.current) return;
      const { dx, dy } = gestureState;
      const THRESHOLD = 20;

      if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;

      const direction = Math.abs(dx) >= Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');

      handleMove(direction);
    },
  }), [handleMove]);

  // Keyboard controls
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyPress = (event) => {
      if (isAnimatingRef.current) return;
      
      const keyMap = {
        ArrowLeft: 'up',
        ArrowRight: 'down', 
        ArrowUp: 'left',
        ArrowDown: 'right',
      };

      if (keyMap[event.key]) {
        event.preventDefault();
        handleMove(keyMap[event.key]);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleMove]);

  // Initialize game on mount
  useEffect(() => {
    if (state.isLoading) return;
    
    if (state.showOnboarding) {
      router.replace('/onboarding');
      return;
    }
    
    initializeGame();
  }, [state.isLoading, state.showOnboarding]);

  const startNewGame = () => {
    // Clear animations
    tileAnimations.current = {};
    initializeGame();
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
          onPress: startNewGame,
        },
      ]
    );
  };

  const showLoseModal = () => {
    Alert.alert(
      '😞 Game Over',
      `Final Score: ${score}\n\nBetter luck next time!`,
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
            <Text style={styles.scoreValue}>{score}</Text>
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

        <View style={styles.gameArea} {...panResponder.panHandlers}>
          <View style={[styles.board, { width: BOARD_SIZE, height: BOARD_SIZE }]}>
            {/* Background grid */}
            {Array.from({ length: 16 }).map((_, i) => {
              const row = Math.floor(i / 4);
              const col = i % 4;
              return (
                <View
                  key={i}
                  style={[
                    styles.gridCell,
                    {
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      left: toX(col),
                      top: toY(row),
                    }
                  ]}
                />
              );
            })}

            {/* Game tiles */}
            {tiles.map((tile) => {
              const anim = initializeTileAnimation(tile.id);
              const tileStyle = getTileStyle(tile.value);
              
              return (
                <Animated.View
                  key={tile.id}
                  style={[
                    styles.tile,
                    tileStyle,
                    {
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      left: toX(tile.y),
                      top: toY(tile.x),
                      transform: [
                        { translateX: anim.translateX },
                        { translateY: anim.translateY },
                        { scale: anim.scale },
                      ],
                      opacity: anim.opacity,
                    },
                  ]}
                >
                  <Text style={[
                    styles.tileText,
                    { 
                      color: tileStyle.color,
                      fontSize: getTileFontSize(tile.value)
                    }
                  ]}>
                    {tile.value}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Controls */}
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
  gameArea: {
    position: 'relative',
  },
  board: {
    backgroundColor: '#bbada0',
    borderRadius: 6,
    padding: CELL_SPACING,
    position: 'relative',
    marginBottom: 20,
  },
  gridCell: {
    backgroundColor: '#cdc1b4',
    borderRadius: 3,
    position: 'absolute',
  },
  tile: {
    borderRadius: 3,
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  tileText: {
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'Roboto',
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