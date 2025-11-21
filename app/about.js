import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

/**
 * About & Help Screen
 * Purpose: App version, FAQ, support links, contact info
 * Features: Version info, FAQ accordion, support links, tutorial access
 */
export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const APP_VERSION = '1.0.0';

  const faqData = [
    {
      id: 1,
      question: 'How do I play 2048?',
      answer: 'Swipe to move tiles in any direction. When two tiles with the same number touch, they merge into one! The goal is to create a tile with the number 2048.',
      expanded: false,
    },
    {
      id: 2,
      question: 'What happens when I reach 2048?',
      answer: 'Congratulations! You win the game. You can choose to continue playing to reach even higher numbers like 4096, 8192, and beyond, or start a new game.',
      expanded: false,
    },
    {
      id: 3,
      question: 'How is my score calculated?',
      answer: 'Each time two tiles merge, the value of the new tile is added to your score. For example, merging two 8s creates a 16 and adds 16 points to your score.',
      expanded: false,
    },
    {
      id: 4,
      question: 'Can I undo a move?',
      answer: 'No, moves cannot be undone. This is part of the challenge! Think carefully before making each move.',
      expanded: false,
    },
    {
      id: 5,
      question: 'Why won\'t my tiles move?',
      answer: 'Tiles only move if the swipe would actually change the board. If all tiles are already positioned against the edge you\'re swiping toward, and no merges are possible, the move is invalid.',
      expanded: false,
    },
    {
      id: 6,
      question: 'Where is my data stored?',
      answer: 'All your game data, including scores and history, is stored locally on your device. No data is sent to external servers.',
      expanded: false,
    }
  ];

  const [expandedFaq, setExpandedFaq] = React.useState(null);

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };


  return (
    <View style={[styles.container, { 
      paddingTop: insets.top, 
      paddingBottom: insets.bottom
    }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.title}>About & Help</Text>
          <View style={styles.placeholder} />
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <View style={styles.appInfo}>
            <View style={styles.appIcon}>
              <Text style={styles.appIconText}>2048</Text>
            </View>
            <View style={styles.appDetails}>
              <Text style={styles.appName}>2048 Game</Text>
              <Text style={styles.appVersion}>Version {APP_VERSION}</Text>
              <Text style={styles.appDescription}>
                The classic sliding number puzzle game with smooth animations and elegant design.
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/tutorial')}
          >
            <Ionicons name="help-circle" size={24} color="#667eea" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Interactive Tutorial</Text>
              <Text style={styles.actionDescription}>Learn how to play with step-by-step guide</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e0" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/history')}
          >
            <Ionicons name="stats-chart" size={24} color="#10b981" />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Game History</Text>
              <Text style={styles.actionDescription}>View your past games and statistics</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e0" />
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-buoy" size={24} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          </View>
          
          {faqData.map((faq) => (
            <View key={faq.id} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleFaq(faq.id)}
              >
                <Text style={styles.faqQuestionText}>{faq.question}</Text>
                <Ionicons 
                  name={expandedFaq === faq.id ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#64748b" 
                />
              </TouchableOpacity>
              {expandedFaq === faq.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Game Tips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb" size={24} color="#f59e0b" />
            <Text style={styles.sectionTitle}>Pro Tips</Text>
          </View>
          
          <View style={styles.tipsList}>
            <View style={styles.tip}>
              <Ionicons name="trophy" size={16} color="#ffd89b" />
              <Text style={styles.tipText}>Keep your highest tile in a corner</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="layers" size={16} color="#f093fb" />
              <Text style={styles.tipText}>Build tiles in descending order</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="eye" size={16} color="#06b6d4" />
              <Text style={styles.tipText}>Plan your moves several steps ahead</Text>
            </View>
            <View style={styles.tip}>
              <Ionicons name="pause" size={16} color="#8b5cf6" />
              <Text style={styles.tipText}>Take breaks to maintain focus</Text>
            </View>
          </View>
        </View>

        {/* Credits */}
        <View style={styles.credits}>
          <Text style={styles.creditsText}>
            Original 2048 game created by Gabriele Cirulli
          </Text>
          <Text style={styles.creditsText}>
            Mobile implementation built with React Native & Expo
          </Text>
          <Text style={styles.creditsText}>
            © 2024 2048 Game - All rights reserved
          </Text>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
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
  appInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  appDetails: {
    flex: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
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
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    paddingBottom: 16,
    paddingLeft: 0,
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  tipsList: {
    gap: 12,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 12,
    flex: 1,
  },
  credits: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 20,
  },
  creditsText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 18,
  },
});