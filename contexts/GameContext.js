import React, { createContext, useContext, useReducer, useEffect } from 'react';
import StorageUtils from '../utils/StorageUtils';

const GameContext = createContext();

const initialState = {
  // Game state
  board: Array(4).fill(null).map(() => Array(4).fill(null)),
  score: 0,
  bestScore: 0,
  gameState: 'playing', // 'playing', 'won', 'lost'
  isAnimating: false,
  hasWon: false, // Track if victory dialog has been shown
  
  // Settings
  soundOn: true,
  volume: 80,
  hapticsOn: true,
  theme: 'system', // 'light', 'dark', 'system'
  nickname: 'Player',
  
  // Statistics
  maxLevel: 0,
  maxScore: 0,
  maxTime: 0,
  
  // Game history
  gameHistory: [],
  currentGame: null,
  
  // App state
  showOnboarding: true,
  isLoading: true,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'INITIALIZE_APP':
      return {
        ...state,
        ...action.payload,
        isLoading: false,
      };
      
    case 'SET_BOARD':
      return {
        ...state,
        board: action.payload,
      };
      
    case 'UPDATE_SCORE':
      return {
        ...state,
        score: action.payload,
        bestScore: Math.max(state.bestScore, action.payload),
      };
      
    case 'SET_GAME_STATE':
      return {
        ...state,
        gameState: action.payload,
      };
      
    case 'SET_ANIMATING':
      return {
        ...state,
        isAnimating: action.payload,
      };
      
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        ...action.payload,
      };
      
    case 'UPDATE_STATS':
      return {
        ...state,
        maxLevel: Math.max(state.maxLevel, action.payload.maxLevel || 0),
        maxScore: Math.max(state.maxScore, action.payload.maxScore || 0),
        maxTime: action.payload.maxTime !== undefined ? 
          (state.maxTime === 0 || (action.payload.maxTime > 0 && action.payload.maxTime < state.maxTime)) ? 
          action.payload.maxTime : state.maxTime : state.maxTime,
      };
      
    case 'ADD_GAME_TO_HISTORY':
      return {
        ...state,
        gameHistory: [action.payload, ...state.gameHistory].slice(0, 50), // Keep last 50 games
      };
      
    case 'NEW_GAME':
      return {
        ...state,
        board: action.payload.board,
        score: 0,
        gameState: 'playing',
        currentGame: action.payload.gameData,
        hasWon: false,
      };
      
    case 'HIDE_ONBOARDING':
      return {
        ...state,
        showOnboarding: false,
      };
      
    case 'ADD_SPECIFIC_TILE':
      return {
        ...state,
        board: action.payload,
      };
      
    case 'SET_HAS_WON':
      return {
        ...state,
        hasWon: action.payload,
      };
      
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  
  useEffect(() => {
    initializeApp();
  }, []);
  
  const initializeApp = async () => {
    try {
      // Get user data
      const userData = await StorageUtils.getUserData();
      
      // Get game data
      const gameData = await StorageUtils.getData();
      
      const payload = {
        showOnboarding: !gameData?.hasSeenOnboarding,
        bestScore: gameData?.maxScore || 0,
        maxLevel: gameData?.maxLevel || 0,
        maxScore: gameData?.maxScore || 0,
        maxTime: gameData?.maxTime || 0,
        soundOn: gameData?.soundOn !== undefined ? gameData.soundOn : true,
        volume: gameData?.volume || 80,
        hapticsOn: gameData?.hapticsOn !== undefined ? gameData.hapticsOn : true,
        theme: gameData?.theme || 'system',
        nickname: gameData?.nickname || 'Player',
        gameHistory: gameData?.gameHistory || [],
      };
      
      dispatch({ type: 'INITIALIZE_APP', payload });
    } catch (error) {
      console.error('Failed to initialize app:', error);
      dispatch({ type: 'INITIALIZE_APP', payload: {} });
    }
  };
  
  const saveGameData = async (data) => {
    try {
      await StorageUtils.setData(data);
    } catch (error) {
      console.error('Failed to save game data:', error);
    }
  };
  
  const value = {
    state,
    dispatch,
    saveGameData,
  };
  
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}