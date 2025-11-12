import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../../contexts/GameContext';

/**
 * Game Details Screen
 * Purpose: Show full info for a specific run + actions (share/delete)
 * Features: Detailed stats, move heatmap mock, action buttons
 */
export default function DetailsScreen() {
  const { id } = useLocalSearchParams();
  const { state, dispatch, saveGameData } = useGame();
  const insets = useSafeAreaInsets();

  const game = state.gameHistory.find(g => g.id === id);

  if (!game) {
    return (
      <View style={[styles.container, { 
        paddingTop: insets.top, 
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right
      }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Game Not Found</Text>
          <Text style={styles.errorDescription}>
            The requested game could not be found in your history.
          </Text>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const shareGame = async () => {
    const shareContent = {
      message: `🎮 2048 Game Result!\n\n` +
               `Final Score: ${game.finalScore}\n` +
               `Highest Tile: ${game.highestTile}\n` +
               `Duration: ${formatDuration(game.durationSec)}\n` +
               `Moves: ${game.moves}\n` +
               `Result: ${game.won ? '🏆 Won!' : '😞 Lost'}\n\n` +
               `Can you beat my score?`,
    };

    try {
      if (Platform.OS === 'web') {
        // For web, copy to clipboard
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareContent.message);
          Alert.alert('Copied!', 'Game result copied to clipboard');
        } else {
          Alert.alert('Share', shareContent.message);
        }
      } else {
        // For mobile, use the share API
        const result = await Share.share(shareContent);
        if (result.action === Share.sharedAction) {
          // Content was shared
        }
      }
    } catch (error) {
      console.error('Error sharing game:', error);
      Alert.alert('Error', 'Unable to share game result');
    }
  };

  const deleteGame = () => {
    Alert.alert(
      'Delete Game',
      'Are you sure you want to delete this game from your history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedHistory = state.gameHistory.filter(g => g.id !== game.id);
            dispatch({ 
              type: 'UPDATE_SETTINGS', 
              payload: { gameHistory: updatedHistory }
            });
            await saveGameData({ gameHistory: updatedHistory });
            Alert.alert('Deleted', 'Game has been removed from your history.');
            router.back();
          },
        },
      ]
    );
  };

  // Mock heatmap data based on game performance
  const generateMockHeatmap = () => {
    const heatmapData = [];
    const intensity = Math.min(game.finalScore / 5000, 1); // Normalize based on score
    
    for (let row = 0; row < 4; row++) {
      heatmapData[row] = [];
      for (let col = 0; col < 4; col++) {
        // Create a mock pattern - more activity in corners and center
        const cornerBonus = (row === 0 || row === 3) && (col === 0 || col === 3) ? 0.3 : 0;
        const centerBonus = (row === 1 || row === 2) && (col === 1 || col === 2) ? 0.2 : 0;
        const baseIntensity = Math.random() * 0.5 + cornerBonus + centerBonus;
        heatmapData[row][col] = Math.min(baseIntensity * intensity, 1);
      }
    }
    
    return heatmapData;
  };

  const heatmapData = generateMockHeatmap();

  const getHeatmapColor = (intensity) => {
    const alpha = Math.max(intensity, 0.1);
    return `rgba(103, 126, 234, ${alpha})`;
  };

  return (
    <View style={[styles.container, { 
      paddingTop: insets.top, 
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right
    }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.title}>Game Details</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Game Status */}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: game.won ? '#10b981' : '#ef4444' }
          ]}>
            <Ionicons
              name={game.won ? 'trophy' : 'close-circle'}
              size={20}
              color="#ffffff"
            />
            <Text style={styles.statusText}>
              {game.won ? 'Victory!' : 'Game Over'}
            </Text>
          </View>
          <Text style={styles.gameDate}>{formatDate(game.startedAt)}</Text>
        </View>

        {/* Main Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.mainStat}>
            <Text style={styles.mainStatValue}>{game.finalScore}</Text>
            <Text style={styles.mainStatLabel}>Final Score</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{game.highestTile}</Text>
              <Text style={styles.statLabel}>Highest Tile</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDuration(game.durationSec)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{game.moves}</Text>
              <Text style={styles.statLabel}>Moves</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {game.moves > 0 ? Math.round(game.finalScore / game.moves) : 0}
              </Text>
              <Text style={styles.statLabel}>Score/Move</Text>
            </View>
          </View>
        </View>

        {/* Move Heatmap (Mock) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics" size={24} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>Activity Heatmap</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Shows where most tile merges occurred during the game
          </Text>
          
          <View style={styles.heatmap}>
            {heatmapData.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.heatmapRow}>
                {row.map((intensity, colIndex) => (
                  <View
                    key={`${rowIndex}-${colIndex}`}
                    style={[
                      styles.heatmapCell,
                      { backgroundColor: getHeatmapColor(intensity) }
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
          
          <View style={styles.heatmapLegend}>
            <Text style={styles.legendText}>Less Activity</Text>
            <View style={styles.legendGradient}>
              {[0.2, 0.4, 0.6, 0.8, 1.0].map(intensity => (
                <View
                  key={intensity}
                  style={[
                    styles.legendSample,
                    { backgroundColor: getHeatmapColor(intensity) }
                  ]}
                />
              ))}
            </View>
            <Text style={styles.legendText}>More Activity</Text>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="speedometer" size={24} color="#06b6d4" />
            <Text style={styles.sectionTitle}>Performance</Text>
          </View>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Efficiency</Text>
              <Text style={styles.metricValue}>
                {game.moves > 0 ? Math.round((game.finalScore / game.moves) * 10) / 10 : 0}
              </Text>
              <Text style={styles.metricUnit}>pts/move</Text>
            </View>
            
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Speed</Text>
              <Text style={styles.metricValue}>
                {game.durationSec > 0 ? Math.round((game.moves / game.durationSec) * 10) / 10 : 0}
              </Text>
              <Text style={styles.metricUnit}>moves/sec</Text>
            </View>
            
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Progress</Text>
              <Text style={styles.metricValue}>
                {Math.log2(game.highestTile || 2)}
              </Text>
              <Text style={styles.metricUnit}>levels</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={shareGame}>
            <Ionicons name="share" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>Share Result</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={deleteGame}
          >
            <Ionicons name="trash" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>Delete Game</Text>
          </TouchableOpacity>
        </View>

        {/* Play Again */}
        <TouchableOpacity 
          style={styles.playAgainButton}
          onPress={() => router.replace('/(tabs)')}
        >
          <Ionicons name="play" size={20} color="#667eea" />
          <Text style={styles.playAgainText}>Play Again</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerButton: {
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
  statusContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 6,
  },
  gameDate: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  statsContainer: {
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
  mainStat: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  mainStatValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 4,
  },
  mainStatLabel: {
    fontSize: 16,
    color: '#64748b',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  section: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  heatmap: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  heatmapRow: {
    flexDirection: 'row',
  },
  heatmapCell: {
    width: 50,
    height: 50,
    margin: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
  },
  legendGradient: {
    flexDirection: 'row',
    marginHorizontal: 12,
  },
  legendSample: {
    width: 20,
    height: 12,
    marginHorizontal: 1,
    borderRadius: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  metricUnit: {
    fontSize: 12,
    color: '#94a3b8',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 12,
    borderRadius: 12,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 6,
  },
  playAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#667eea',
  },
  playAgainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 6,
  },
});