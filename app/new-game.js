import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Modal,
  Alert
} from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context'; // 移除，使用根布局的 SafeAreaView
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../contexts/GameContext';
import { initializeBoard } from '../utils/GameLogic';

/**
 * Start New Game Screen
 * Purpose: Confirmation + game settings before starting new run
 * Features: Settings toggles, confirmation modal, success states
 */
export default function NewGameScreen() {
  const { state, dispatch, saveGameData } = useGame();
  const [tempSettings, setTempSettings] = useState({
    soundOn: state.soundOn,
    hapticsOn: state.hapticsOn,
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const updateTempSetting = (key, value) => {
    setTempSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleStartGame = async () => {
    setIsStarting(true);
    
    try {
      // Save any setting changes
      const settingsChanged = 
        tempSettings.soundOn !== state.soundOn ||
        tempSettings.hapticsOn !== state.hapticsOn;
      
      if (settingsChanged) {
        dispatch({ type: 'UPDATE_SETTINGS', payload: tempSettings });
        await saveGameData(tempSettings);
      }

      // Create new game
      const newBoard = initializeBoard();
      const gameData = {
        id: Date.now().toString(),
        startedAt: new Date().toISOString(),
        moves: 0,
      };

      dispatch({ type: 'NEW_GAME', payload: { board: newBoard, gameData } });
      
      // Show success and navigate
      setShowConfirmation(true);
      
      setTimeout(() => {
        setShowConfirmation(false);
        router.replace('/(tabs)');
      }, 1500);

    } catch (error) {
      console.error('Error starting new game:', error);
      Alert.alert('Error', 'Failed to start new game. Please try again.');
      setIsStarting(false);
    }
  };

  const ConfirmationModal = () => (
    <Modal
      visible={showConfirmation}
      transparent
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          </View>
          <Text style={styles.modalTitle}>Game Started!</Text>
          <Text style={styles.modalDescription}>
            Good luck reaching 2048!
          </Text>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.title}>Start New Game</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Game Preview */}
        <View style={styles.previewSection}>
          <View style={styles.gamePreview}>
            <View style={styles.previewBoard}>
              <View style={styles.previewTile}>
                <Text style={styles.previewTileText}>2</Text>
              </View>
              <View style={styles.previewTile}>
                <Text style={styles.previewTileText}>4</Text>
              </View>
              <View style={styles.previewEmpty} />
              <View style={styles.previewEmpty} />
              <View style={styles.previewEmpty} />
              <View style={styles.previewEmpty} />
              <View style={styles.previewEmpty} />
              <View style={styles.previewEmpty} />
              <View style={styles.previewEmpty} />
              <View style={styles.previewEmpty} />
              <View style={styles.previewEmpty} />
              <View style={styles.previewEmpty} />
              <View style={styles.previewEmpty} />
              <View style={styles.previewEmpty} />
              <View style={styles.previewEmpty} />
              <View style={styles.previewEmpty} />
            </View>
          </View>
          <Text style={styles.previewDescription}>
            A fresh 4×4 board will be created with two starting tiles
          </Text>
        </View>

        {/* Game Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Game Settings</Text>
          <Text style={styles.sectionDescription}>
            These settings will apply to your new game
          </Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="volume-high" size={24} color="#667eea" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Sound Effects</Text>
                <Text style={styles.settingDescription}>
                  Play audio feedback for moves and merges
                </Text>
              </View>
            </View>
            <Switch
              value={tempSettings.soundOn}
              onValueChange={(value) => updateTempSetting('soundOn', value)}
              trackColor={{ false: '#e2e8f0', true: '#667eea' }}
              thumbColor={tempSettings.soundOn ? '#ffffff' : '#cbd5e0'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="phone-portrait" size={24} color="#f093fb" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
                <Text style={styles.settingDescription}>
                  Vibrate on successful moves and merges
                </Text>
              </View>
            </View>
            <Switch
              value={tempSettings.hapticsOn}
              onValueChange={(value) => updateTempSetting('hapticsOn', value)}
              trackColor={{ false: '#e2e8f0', true: '#f093fb' }}
              thumbColor={tempSettings.hapticsOn ? '#ffffff' : '#cbd5e0'}
            />
          </View>
        </View>

        {/* Game Rules Reminder */}
        <View style={styles.rulesSection}>
          <Text style={styles.sectionTitle}>Quick Reminder</Text>
          
          <View style={styles.ruleItem}>
            <Ionicons name="finger-print" size={20} color="#8b5cf6" />
            <Text style={styles.ruleText}>Swipe to move all tiles in that direction</Text>
          </View>
          
          <View style={styles.ruleItem}>
            <Ionicons name="add-circle" size={20} color="#06b6d4" />
            <Text style={styles.ruleText}>Identical tiles merge when they collide</Text>
          </View>
          
          <View style={styles.ruleItem}>
            <Ionicons name="trophy" size={20} color="#ffd89b" />
            <Text style={styles.ruleText}>Reach 2048 to win!</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.startButton, { opacity: isStarting ? 0.6 : 1 }]}
            onPress={handleStartGame}
            disabled={isStarting}
          >
            {isStarting ? (
              <>
                <Text style={styles.startButtonText}>Starting...</Text>
              </>
            ) : (
              <>
                <Ionicons name="play" size={20} color="#ffffff" />
                <Text style={styles.startButtonText}>Start Game</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Current Best Score */}
        <View style={styles.bestScoreContainer}>
          <Text style={styles.bestScoreLabel}>Your Best Score</Text>
          <Text style={styles.bestScoreValue}>{state.maxScore || 0}</Text>
        </View>
      </View>

      <ConfirmationModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  placeholder: {
    width: 40,
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  gamePreview: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  previewBoard: {
    width: 160,
    height: 160,
    backgroundColor: '#bbada0',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  previewTile: {
    width: 32,
    height: 32,
    backgroundColor: '#eee4da',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTileText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#776e65',
  },
  previewEmpty: {
    width: 32,
    height: 32,
    backgroundColor: '#cdc1b4',
    borderRadius: 4,
  },
  previewDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  settingsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    flex: 1,
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  rulesSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ruleText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 12,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  startButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 6,
  },
  bestScoreContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffd89b',
  },
  bestScoreLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  bestScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  successIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});