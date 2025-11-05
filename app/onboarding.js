import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform
} from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context'; // 移除，使用根布局的 SafeAreaView
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGame } from '../contexts/GameContext';

/**
 * Onboarding Screen
 * Purpose: Brief value prop + tutorial link + privacy policy
 * Shows welcome message and game rules (only on first launch)
 */
export default function OnboardingScreen() {
  const { dispatch, saveGameData } = useGame();

  const handleGetStarted = async () => {
    // 标记已看过onboarding，确保只在第一次登录时显示
    await saveGameData({ hasSeenOnboarding: true });
    dispatch({ type: 'HIDE_ONBOARDING' });
    router.replace('/(tabs)');
  };

  const showTutorial = () => {
    router.push('/tutorial');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>2048</Text>
          </View>
          <Text style={styles.tagline}>
            Swipe, merge, and chase your best score—classic 2048, flawlessly smooth.
          </Text>
        </View>

        {/* Game Rules Summary */}
        <View style={styles.rulesContainer}>
          <Text style={styles.sectionTitle}>How to Play</Text>
          
          <View style={styles.rule}>
            <View style={styles.ruleIcon}>
              <Ionicons name="finger-print" size={24} color="#667eea" />
            </View>
            <View style={styles.ruleText}>
              <Text style={styles.ruleTitle}>Swipe to Move</Text>
              <Text style={styles.ruleDescription}>
                Use gestures to slide tiles in any direction
              </Text>
            </View>
          </View>

          <View style={styles.rule}>
            <View style={styles.ruleIcon}>
              <Ionicons name="add-circle" size={24} color="#f093fb" />
            </View>
            <View style={styles.ruleText}>
              <Text style={styles.ruleTitle}>Combine Numbers</Text>
              <Text style={styles.ruleDescription}>
                When two tiles with the same number touch, they merge into one
              </Text>
            </View>
          </View>

          <View style={styles.rule}>
            <View style={styles.ruleIcon}>
              <Ionicons name="trophy" size={24} color="#ffd89b" />
            </View>
            <View style={styles.ruleText}>
              <Text style={styles.ruleTitle}>Reach 2048</Text>
              <Text style={styles.ruleDescription}>
                Create a tile with the number 2048 to win!
              </Text>
            </View>
          </View>

          <View style={styles.rule}>
            <View style={styles.ruleIcon}>
              <Ionicons name="warning" size={24} color="#ff6b6b" />
            </View>
            <View style={styles.ruleText}>
              <Text style={styles.ruleTitle}>Don't Fill Up</Text>
              <Text style={styles.ruleDescription}>
                Game over when the board is full and no moves are possible
              </Text>
            </View>
          </View>
        </View>

        {/* Options */}
        <View style={styles.options}>
          <TouchableOpacity style={styles.tutorialButton} onPress={showTutorial}>
            <Ionicons name="help-circle-outline" size={20} color="#667eea" />
            <Text style={styles.tutorialButtonText}>View Interactive Tutorial</Text>
          </TouchableOpacity>
        </View>

        {/* CTA Button */}
        <TouchableOpacity style={styles.startButton} onPress={handleGetStarted}>
          <Text style={styles.startButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#ffffff" />
        </TouchableOpacity>

        {/* Privacy Link */}
        <TouchableOpacity style={styles.privacyLink}>
          <Text style={styles.privacyText}>Privacy Policy</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tagline: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginHorizontal: 20,
  },
  rulesContainer: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  ruleIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  ruleText: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  options: {
    marginBottom: 30,
  },
  tutorialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#667eea',
    borderRadius: 12,
    marginBottom: 16,
  },
  tutorialButtonText: {
    fontSize: 16,
    color: '#667eea',
    marginLeft: 8,
    fontWeight: '500',
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#667eea',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
  },
  privacyLink: {
    alignItems: 'center',
  },
  privacyText: {
    fontSize: 14,
    color: '#94a3b8',
    textDecorationLine: 'underline',
  },
});