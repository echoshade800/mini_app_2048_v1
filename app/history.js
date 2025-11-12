import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../contexts/GameContext';
import { initializeBoard } from '../utils/GameLogic';

/**
 * Game History Screen
 * Purpose: Browse recent runs with search/filter + tap for details
 * Features: List view, filter chips, search, detailed run info
 */
export default function HistoryScreen() {
  const { state, dispatch } = useGame();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  const filters = ['All', 'Wins', 'Loses'];

  const filteredGames = state.gameHistory.filter(game => {
    // Apply filter
    if (selectedFilter === 'Wins' && !game.won) return false;
    if (selectedFilter === 'Loses' && game.won) return false;

    // Apply search (search by score range or tile value)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        game.finalScore.toString().includes(query) ||
        game.highestTile.toString().includes(query) ||
        game.moves.toString().includes(query)
      );
    }

    return true;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 
      ? `${minutes}m ${remainingSeconds}s`
      : `${remainingSeconds}s`;
  };

  const handleStartNewGame = () => {
    // Create new game
    const newBoard = initializeBoard();
    const gameData = {
      id: Date.now().toString(),
      startedAt: new Date().toISOString(),
      moves: 0,
    };

    dispatch({ type: 'NEW_GAME', payload: { board: newBoard, gameData } });
    
    // Navigate to main game screen
    router.replace('/(tabs)');
  };

  const renderGameItem = ({ item: game }) => (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() => router.push(`/details/${game.id}`)}
    >
      <View style={styles.gameHeader}>
        <View style={styles.gameDateContainer}>
          <Text style={styles.gameDate}>{formatDate(game.startedAt)}</Text>
          <View style={[styles.gameStatus, { backgroundColor: game.won ? '#10b981' : '#ef4444' }]}>
            <Ionicons
              name={game.won ? 'trophy' : 'close-circle'}
              size={14}
              color="#ffffff"
            />
            <Text style={styles.gameStatusText}>{game.won ? 'Won' : 'Lost'}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#cbd5e0" />
      </View>

      <View style={styles.gameStats}>
        <View style={styles.statGroup}>
          <Text style={styles.statValue}>{game.finalScore}</Text>
          <Text style={styles.statLabel}>Final Score</Text>
        </View>
        <View style={styles.statGroup}>
          <Text style={styles.statValue}>{game.highestTile}</Text>
          <Text style={styles.statLabel}>Highest Tile</Text>
        </View>
        <View style={styles.statGroup}>
          <Text style={styles.statValue}>{formatDuration(game.durationSec)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statGroup}>
          <Text style={styles.statValue}>{game.moves}</Text>
          <Text style={styles.statLabel}>Moves</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="game-controller-outline" size={64} color="#cbd5e0" />
      <Text style={styles.emptyTitle}>No Games Found</Text>
      <Text style={styles.emptyDescription}>
        {selectedFilter === 'All' 
          ? 'Start playing to see your game history here!'
          : `No games match the "${selectedFilter}" filter.`}
      </Text>
      <TouchableOpacity
        style={styles.playButton}
        onPress={() => router.replace('/(tabs)')}
      >
        <Ionicons name="play" size={16} color="#ffffff" />
        <Text style={styles.playButtonText}>Start Playing</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Game History</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by score, tile, or moves..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        {filters.map(filter => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              { 
                backgroundColor: selectedFilter === filter ? '#667eea' : '#f1f5f9',
                borderColor: selectedFilter === filter ? '#667eea' : '#e2e8f0'
              }
            ]}
            onPress={() => setSelectedFilter(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: selectedFilter === filter ? '#ffffff' : '#64748b' }
              ]}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {filteredGames.length} {filteredGames.length === 1 ? 'game' : 'games'} found
        </Text>
        {filteredGames.length > 0 && (
          <TouchableOpacity onPress={handleStartNewGame}>
            <Text style={styles.newGameLink}>Start New Game</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <FlatList
        data={filteredGames}
        keyExtractor={(item) => item.id}
        renderItem={renderGameItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={filteredGames.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  list: {
    padding: 20,
  },
  emptyList: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    marginLeft: 8,
  },
  filtersContainer: {
    paddingRight: 20,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#64748b',
  },
  newGameLink: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  gameCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gameDate: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 12,
  },
  gameStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gameStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 4,
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statGroup: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 6,
  },
});