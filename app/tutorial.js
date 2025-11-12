import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  FlatList,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

/**
 * Tutorial Screen
 * Purpose: Interactive tutorial showing game rules and controls
 * Features: Step-by-step guide, visual examples, practice mode
 */
export default function TutorialScreen() {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const flatListRef = useRef(null);

  const tutorialSteps = [
    {
      title: 'Welcome to 2048!',
      description: 'Learn how to play the addictive number puzzle game.',
      icon: 'game-controller',
      content: (
        <View style={styles.welcomeContent}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>2048</Text>
          </View>
          <Text style={styles.welcomeText}>
            Master the art of combining numbers to reach the legendary 2048 tile!
          </Text>
        </View>
      )
    },
    {
      title: 'The Board',
      description: 'Your playing field is a 4×4 grid with numbered tiles.',
      icon: 'grid',
      content: (
        <View style={styles.boardDemo}>
          <View style={styles.demoBoard}>
            <View style={[styles.demoTile, { backgroundColor: '#eee4da' }]}>
              <Text style={[styles.demoTileText, { color: '#776e65' }]}>2</Text>
            </View>
            <View style={[styles.demoTile, { backgroundColor: '#ede0c8' }]}>
              <Text style={[styles.demoTileText, { color: '#776e65' }]}>4</Text>
            </View>
            <View style={styles.demoEmpty} />
            <View style={styles.demoEmpty} />
            <View style={styles.demoEmpty} />
            <View style={styles.demoEmpty} />
            <View style={styles.demoEmpty} />
            <View style={styles.demoEmpty} />
            <View style={styles.demoEmpty} />
            <View style={styles.demoEmpty} />
            <View style={styles.demoEmpty} />
            <View style={styles.demoEmpty} />
            <View style={styles.demoEmpty} />
            <View style={styles.demoEmpty} />
            <View style={styles.demoEmpty} />
            <View style={styles.demoEmpty} />
          </View>
          <Text style={styles.demoDescription}>
            Every game starts with two tiles: usually two 2s or a 2 and a 4.
          </Text>
        </View>
      )
    },
    {
      title: 'Moving Tiles',
      description: 'Swipe in any direction to slide all tiles.',
      icon: 'finger-print',
      content: (
        <View style={styles.moveDemo}>
          <View style={styles.swipeDirections}>
            <View style={styles.directionItem}>
              <Ionicons name="arrow-up" size={32} color="#667eea" />
              <Text style={styles.directionText}>Up</Text>
            </View>
            <View style={styles.directionRow}>
              <View style={styles.directionItem}>
                <Ionicons name="arrow-back" size={32} color="#667eea" />
                <Text style={styles.directionText}>Left</Text>
              </View>
              <View style={styles.directionItem}>
                <Ionicons name="arrow-forward" size={32} color="#667eea" />
                <Text style={styles.directionText}>Right</Text>
              </View>
            </View>
            <View style={styles.directionItem}>
              <Ionicons name="arrow-down" size={32} color="#667eea" />
              <Text style={styles.directionText}>Down</Text>
            </View>
          </View>
          <Text style={styles.demoDescription}>
            All tiles slide as far as possible in the chosen direction.
          </Text>
        </View>
      )
    },
    {
      title: 'Merging Tiles',
      description: 'When two identical tiles collide, they combine into one!',
      icon: 'add-circle',
      content: (
        <View style={styles.mergeDemo}>
          <View style={styles.mergeExample}>
            <View style={[styles.demoTile, { backgroundColor: '#eee4da' }]}>
              <Text style={[styles.demoTileText, { color: '#776e65' }]}>2</Text>
            </View>
            <Ionicons name="add" size={20} color="#64748b" />
            <View style={[styles.demoTile, { backgroundColor: '#eee4da' }]}>
              <Text style={[styles.demoTileText, { color: '#776e65' }]}>2</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#667eea" />
            <View style={[styles.demoTile, { backgroundColor: '#ede0c8' }]}>
              <Text style={[styles.demoTileText, { color: '#776e65' }]}>4</Text>
            </View>
          </View>
          <Text style={styles.demoDescription}>
            2 + 2 = 4! The merged tile's value is added to your score.
          </Text>
          <View style={styles.mergeRules}>
            <View style={styles.ruleItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.ruleText}>Only identical tiles can merge</Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.ruleText}>Each tile merges only once per move</Text>
            </View>
          </View>
        </View>
      )
    },
    {
      title: 'Winning & Losing',
      description: 'Learn the victory and defeat conditions.',
      icon: 'trophy',
      content: (
        <View style={styles.winLoseDemo}>
          <View style={styles.conditionSection}>
            <View style={styles.conditionHeader}>
              <Ionicons name="trophy" size={24} color="#ffd89b" />
              <Text style={styles.conditionTitle}>You Win!</Text>
            </View>
            <View style={[styles.demoTile, { backgroundColor: '#edc22e', width: 60, height: 60 }]}>
              <Text style={[styles.demoTileText, { color: '#f9f6f2', fontSize: 20 }]}>2048</Text>
            </View>
            <Text style={styles.conditionText}>
              Create a tile with the number 2048 to achieve victory!
            </Text>
          </View>
          
          <View style={styles.conditionSection}>
            <View style={styles.conditionHeader}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
              <Text style={styles.conditionTitle}>Game Over</Text>
            </View>
            <View style={styles.fullBoard}>
              {[2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2].map((num, i) => (
                <View key={i} style={[styles.miniTile, { 
                  backgroundColor: num === 2 ? '#eee4da' : '#ede0c8' 
                }]}>
                  <Text style={[styles.miniTileText, { color: '#776e65' }]}>{num}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.conditionText}>
              No empty spaces and no possible merges = game over!
            </Text>
          </View>
        </View>
      )
    },
    {
      title: 'Scoring System',
      description: 'Understand how points are earned and tracked.',
      icon: 'analytics',
      content: (
        <View style={styles.scoreDemo}>
          <View style={styles.scoreExample}>
            <Text style={styles.scoreTitle}>How Scoring Works</Text>
            <View style={styles.scoreRow}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Merge</Text>
                <View style={styles.mergeExample}>
                  <View style={[styles.smallTile, { backgroundColor: '#f2b179' }]}>
                    <Text style={[styles.smallTileText, { color: '#f9f6f2' }]}>8</Text>
                  </View>
                  <Ionicons name="add" size={16} color="#64748b" />
                  <View style={[styles.smallTile, { backgroundColor: '#f2b179' }]}>
                    <Text style={[styles.smallTileText, { color: '#f9f6f2' }]}>8</Text>
                  </View>
                </View>
                <Text style={styles.scoreResult}>+16 points</Text>
              </View>
            </View>
            <View style={styles.scoringRules}>
              <Text style={styles.ruleHeader}>Scoring Rules:</Text>
              <Text style={styles.ruleText}>• Points = value of the new merged tile</Text>
              <Text style={styles.ruleText}>• Multiple merges in one move all count</Text>
              <Text style={styles.ruleText}>• Your best score is saved automatically</Text>
            </View>
          </View>
        </View>
      )
    },
    {
      title: 'Strategy Tips',
      description: 'Pro tips to help you reach 2048 faster!',
      icon: 'bulb',
      content: (
        <View style={styles.tipsDemo}>
          <ScrollView style={styles.tipsList} showsVerticalScrollIndicator={false}>
            <View style={styles.tip}>
              <Ionicons name="trending-up" size={20} color="#667eea" />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Keep High Tiles in Corners</Text>
                <Text style={styles.tipText}>
                  Build your highest tiles in one corner to maintain control.
                </Text>
              </View>
            </View>
            
            <View style={styles.tip}>
              <Ionicons name="layers" size={20} color="#f093fb" />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Build in One Direction</Text>
                <Text style={styles.tipText}>
                  Focus on moving in 3 directions, avoid the 4th to keep tiles organized.
                </Text>
              </View>
            </View>
            
            <View style={styles.tip}>
              <Ionicons name="eye" size={20} color="#06b6d4" />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Plan Ahead</Text>
                <Text style={styles.tipText}>
                  Think about where tiles will land before making your move.
                </Text>
              </View>
            </View>
            
            <View style={styles.tip}>
              <Ionicons name="flash" size={20} color="#ffd89b" />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Don't Rush</Text>
                <Text style={styles.tipText}>
                  Take your time to analyze the board. One wrong move can end the game!
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      )
    },
    {
      title: 'Ready to Play!',
      description: 'You\'re all set to master 2048. Good luck!',
      icon: 'rocket',
      content: (
        <View style={styles.readyContent}>
          <View style={styles.readyIcon}>
            <Ionicons name="rocket" size={64} color="#667eea" />
          </View>
          <Text style={styles.readyTitle}>You're Ready!</Text>
          <Text style={styles.readyText}>
            Now you know everything needed to master 2048. 
            Time to put your skills to the test!
          </Text>
          <View style={styles.finalTips}>
            <Text style={styles.finalTipTitle}>Quick Reminders:</Text>
            <Text style={styles.finalTip}>🎯 Goal: Create a 2048 tile</Text>
            <Text style={styles.finalTip}>👆 Control: Swipe to move</Text>
            <Text style={styles.finalTip}>🧩 Strategy: Keep high tiles in corners</Text>
            <Text style={styles.finalTip}>🏆 Challenge: Beat your best score!</Text>
          </View>
        </View>
      )
    }
  ];

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentStep(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  const finishTutorial = () => {
    router.back();
  };

  const renderTutorialStep = ({ item, index }) => {
    return (
      <View style={[styles.pageContainer, { width: screenWidth }]}>
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name={item.icon} size={32} color="#667eea" />
            </View>
            <Text style={styles.stepTitle}>{item.title}</Text>
            <Text style={styles.stepDescription}>{item.description}</Text>
          </View>

          <View style={styles.stepContent}>
            {item.content}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={[styles.container, { 
      paddingTop: insets.top, 
      paddingBottom: insets.bottom
    }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tutorial</Text>
        <Text style={styles.stepCounter}>
          {currentStep + 1}/{tutorialSteps.length}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }
            ]}
          />
        </View>
      </View>

      {/* Content - FlatList with horizontal scrolling */}
      <FlatList
        ref={flatListRef}
        data={tutorialSteps}
        renderItem={renderTutorialStep}
        keyExtractor={(item, index) => index.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        getItemLayout={(data, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        {/* Page Indicators (Dots) */}
        <View style={styles.indicatorContainer}>
          {tutorialSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentStep && styles.indicatorActive,
                index < tutorialSteps.length - 1 && { marginRight: 8 }
              ]}
            />
          ))}
        </View>

        {/* Finish Button (only on last page) */}
        {currentStep === tutorialSteps.length - 1 && (
          <TouchableOpacity style={styles.finishButton} onPress={finishTutorial}>
            <Text style={styles.finishButtonText}>Start Playing</Text>
            <Ionicons name="play" size={20} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  stepCounter: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  pageContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#667eea20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  stepContent: {
    flex: 1,
  },
  
  // Step-specific styles
  welcomeContent: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  welcomeText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 26,
  },
  
  boardDemo: {
    alignItems: 'center',
  },
  demoBoard: {
    width: 200,
    height: 200,
    backgroundColor: '#bbada0',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    marginBottom: 16,
  },
  demoTile: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  demoTileText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  demoEmpty: {
    width: 40,
    height: 40,
    backgroundColor: '#cdc1b4',
    borderRadius: 6,
  },
  demoDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  moveDemo: {
    alignItems: 'center',
  },
  swipeDirections: {
    alignItems: 'center',
    marginBottom: 20,
  },
  directionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginVertical: 20,
  },
  directionItem: {
    alignItems: 'center',
  },
  directionText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  
  mergeDemo: {
    alignItems: 'center',
  },
  mergeExample: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  mergeRules: {
    marginTop: 20,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },
  
  winLoseDemo: {
    gap: 30,
  },
  conditionSection: {
    alignItems: 'center',
  },
  conditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  conditionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 8,
  },
  conditionText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
  },
  fullBoard: {
    width: 160,
    height: 160,
    backgroundColor: '#bbada0',
    borderRadius: 8,
    padding: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  miniTile: {
    width: 32,
    height: 32,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniTileText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  scoreDemo: {
    alignItems: 'center',
  },
  scoreExample: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
  },
  scoreRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  scoreResult: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 8,
  },
  smallTile: {
    width: 32,
    height: 32,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallTileText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  scoringRules: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  ruleHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  
  tipsDemo: {
    height: 300,
  },
  tipsList: {
    flex: 1,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  
  readyContent: {
    alignItems: 'center',
  },
  readyIcon: {
    marginBottom: 20,
  },
  readyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  readyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  finalTips: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  finalTipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  finalTip: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
    lineHeight: 20,
  },
  
  bottomNavigation: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e0',
  },
  indicatorActive: {
    width: 24,
    backgroundColor: '#667eea',
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
  },
});