import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../../contexts/GameContext';

// 动态导入 Slider，H5 环境可能不支持
let Slider = null;
if (Platform.OS !== 'web') {
  try {
    Slider = require('@react-native-community/slider').default;
  } catch (error) {
    console.log('Slider not available on this platform');
  }
}

/**
 * Profile & Settings Screen
 * Purpose: User preferences, local stats, developer tools
 * Features: Sound/haptics/theme settings, best scores, data export
 */
export default function ProfileScreen() {
  const { state, dispatch, saveGameData } = useGame();

  const updateSetting = async (key, value) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: value } });
    await saveGameData({ [key]: value });
  };

  const resetLocalBest = () => {
    Alert.alert(
      'Reset Local Best',
      'This will reset all your best scores and statistics. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const resetStats = { maxLevel: 0, maxScore: 0, maxTime: 0 };
            dispatch({ type: 'UPDATE_STATS', payload: resetStats });
            dispatch({ type: 'UPDATE_SCORE', payload: 0 });
            await saveGameData(resetStats);
            Alert.alert('Reset Complete', 'Your local statistics have been reset.');
          },
        },
      ]
    );
  };

  const exportData = () => {
    const exportableData = {
      stats: {
        maxLevel: state.maxLevel,
        maxScore: state.maxScore,
        maxTime: state.maxTime,
      },
      settings: {
        soundOn: state.soundOn,
        volume: state.volume,
        hapticsOn: state.hapticsOn,
        theme: state.theme,
        nickname: state.nickname,
      },
      gameHistory: state.gameHistory.slice(0, 10), // Last 10 games
    };

    Alert.alert(
      'Export Data',
      `Data exported successfully!\n\n${JSON.stringify(exportableData, null, 2)}`,
      [{ text: 'OK' }],
      { cancelable: true }
    );
  };

  const forceResync = () => {
    Alert.alert('Force Resync', 'Resync functionality would connect to cloud storage.', [
      { text: 'OK' }
    ]);
  };


  const recentGames = state.gameHistory.slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile & Settings</Text>
        </View>

        {/* User Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle" size={24} color="#667eea" />
            <Text style={styles.sectionTitle}>Player Info</Text>
          </View>
          
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{state.nickname.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.nickname}>{state.nickname}</Text>
              <Text style={styles.uid}>ID: {state.uid || 'Local Player'}</Text>
            </View>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={24} color="#ffd89b" />
            <Text style={styles.sectionTitle}>Best Statistics</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{state.maxLevel || 0}</Text>
              <Text style={styles.statLabel}>Highest Tile</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{state.maxScore || 0}</Text>
              <Text style={styles.statLabel}>Best Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {state.maxTime ? `${state.maxTime}s` : '--'}
              </Text>
              <Text style={styles.statLabel}>Fastest Win</Text>
            </View>
          </View>
        </View>

        {/* Recent Games */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={24} color="#f093fb" />
            <Text style={styles.sectionTitle}>Recent Games</Text>
            <TouchableOpacity onPress={() => router.push('/history')}>
              <Text style={styles.viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {recentGames.length === 0 ? (
            <Text style={styles.emptyText}>No games played yet</Text>
          ) : (
            recentGames.map((game, index) => (
              <TouchableOpacity
                key={game.id}
                style={styles.gameItem}
                onPress={() => router.push(`/details/${game.id}`)}
              >
                <View style={styles.gameInfo}>
                  <Text style={styles.gameScore}>{game.finalScore}</Text>
                  <Text style={styles.gameDetails}>
                    Tile: {game.highestTile} • {game.durationSec}s • {game.moves} moves
                  </Text>
                </View>
                <View style={[styles.gameStatus, { backgroundColor: game.won ? '#10b981' : '#ef4444' }]}>
                  <Ionicons
                    name={game.won ? 'trophy' : 'close-circle'}
                    size={16}
                    color="#ffffff"
                  />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings" size={24} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>Preferences</Text>
          </View>

          {/* Haptics (Mobile only) */}
          {Platform.OS !== 'web' && (
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
                <Text style={styles.settingDescription}>Vibrate on moves and merges</Text>
              </View>
              <Switch
                value={state.hapticsOn}
                onValueChange={(value) => updateSetting('hapticsOn', value)}
                trackColor={{ false: '#e2e8f0', true: '#667eea' }}
                thumbColor={state.hapticsOn ? '#ffffff' : '#cbd5e0'}
              />
            </View>
          )}
        </View>

        {/* Developer Tools */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="code" size={24} color="#06b6d4" />
            <Text style={styles.sectionTitle}>Developer Tools</Text>
          </View>

          <TouchableOpacity style={styles.actionButton} onPress={exportData}>
            <Ionicons name="download" size={20} color="#667eea" />
            <Text style={styles.actionButtonText}>Export Data (JSON)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={resetLocalBest}>
            <Ionicons name="refresh" size={20} color="#ef4444" />
            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Reset Local Best</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={forceResync}>
            <Ionicons name="cloud-upload" size={20} color="#10b981" />
            <Text style={[styles.actionButtonText, { color: '#10b981' }]}>Force Resync</Text>
          </TouchableOpacity>
        </View>

        {/* Navigation Links */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.navigationButton}
            onPress={() => router.push('/about')}
          >
            <Ionicons name="information-circle" size={20} color="#667eea" />
            <Text style={styles.navigationButtonText}>About & Help</Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e0" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navigationButton}
            onPress={() => router.push('/tutorial')}
          >
            <Ionicons name="help-circle" size={20} color="#667eea" />
            <Text style={styles.navigationButtonText}>View Tutorial</Text>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e0" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    // H5 适配
    ...(Platform.OS === 'web' && {
      minHeight: '100vh',
      maxWidth: 600,
      marginHorizontal: 'auto',
    }),
  },
  content: {
    padding: Platform.OS === 'web' ? 16 : 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
    flex: 1,
  },
  viewAllLink: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userDetails: {
    flex: 1,
  },
  nickname: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  uid: {
    fontSize: 14,
    color: '#64748b',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  gameInfo: {
    flex: 1,
  },
  gameScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  gameDetails: {
    fontSize: 14,
    color: '#64748b',
  },
  gameStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingInfo: {
    flex: 1,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  slider: {
    flex: 1,
    marginHorizontal: 12,
    height: 40,
  },
  volumeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginLeft: 8,
    minWidth: 30,
    textAlign: 'center',
  },
  themeSelector: {
    flexDirection: 'row',
    marginTop: 8,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  themeOptionText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#667eea',
    marginLeft: 8,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
    // H5 适配：添加鼠标悬停效果
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  navigationButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginLeft: 8,
    flex: 1,
  },
  // H5 音量控制样式
  webVolumeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  volumeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  volumeBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
});