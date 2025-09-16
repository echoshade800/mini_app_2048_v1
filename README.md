# 2048 - React Native Expo Game

**Swipe, merge, and chase your best score—classic 2048, flawlessly smooth.**

A beautifully designed 2048 puzzle game built with React Native and Expo, featuring smooth animations, responsive design, and comprehensive game tracking.

## 🚀 Features

### Core Gameplay
- **Classic 2048 mechanics** with accurate game logic
- **Smooth swipe gestures** for mobile and **keyboard controls** for web
- **Buttery animations** for tile movements, merges, and spawns
- **Win/lose detection** with proper modal dialogs
- **Score tracking** with local best score persistence

### Navigation & Screens
- **Tab-based navigation** (Home, Profile) with stack screens
- **Onboarding flow** with rules and tutorial access
- **Game history** with detailed run tracking and search/filter
- **Profile & settings** with preferences and statistics
- **Interactive tutorial** with step-by-step guidance
- **About & help** with FAQ and support links

### Data & Storage
- **Local storage** using AsyncStorage for all game data
- **Game statistics** tracking (max level, max score, fastest win)
- **Run history** with detailed metrics and performance data
- **Settings persistence** (sound, haptics, theme preferences)

### Design & UX
- **Modern, clean interface** with subtle shadows and gradients
- **Responsive design** working on iOS, Android, and Web
- **Theme support** (Light/Dark/System) with smooth transitions
- **Haptic feedback** and sound effects (with user controls)
- **Accessibility** considerations with proper contrast ratios

## 📱 Installation

### Prerequisites
- Node.js 16+ and npm
- Expo CLI: `npm install -g expo-cli`
- For mobile development: Expo Go app on your device

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# For H5/web development
npm run web

# Build for production
npm run build:web

# Preview web build locally
npm run preview:web
```

## 🌐 H5/Web Support

This app is fully compatible with H5/web browsers:

### Features
- **Responsive Design**: Adapts to different screen sizes
- **Touch & Mouse Support**: Works with both touch gestures and mouse interactions
- **Keyboard Controls**: Arrow keys for desktop users
- **Progressive Web App**: Can be installed as a PWA
- **Cross-browser Compatibility**: Works on Chrome, Firefox, Safari, Edge

### Web-specific Optimizations
- Larger board size for desktop screens
- Optimized font stack for web browsers
- Custom volume controls (slider replacement)
- Disabled text selection for better UX
- Proper cursor styles for interactive elements

### Running on Web
```bash
# Development
npm run web

# Production build
npm run build:web

# Preview production build
npm run preview:web
```

## 🎮 How to Play

1. **Swipe** in any direction to move all tiles
2. **Merge** identical numbers when they collide
3. **Reach 2048** to win (but you can continue playing!)
4. **Avoid** filling the board with no possible moves

### Controls
- **Mobile**: Swipe gestures in any direction
- **Web**: Arrow keys or mouse swipes
- **Keyboard shortcuts**: Arrow keys (prevents page scroll)

## 🏗️ Architecture

### File Structure
```
app/
├── (tabs)/           # Tab navigation screens
│   ├── index.js     # Home/Game screen
│   └── profile.js   # Profile & settings
├── details/[id].js  # Game detail screen
├── history.js       # Game history list
├── new-game.js      # New game confirmation
├── tutorial.js      # Interactive tutorial
├── about.js         # About & help
└── onboarding.js    # First-time user flow

contexts/
└── GameContext.js   # Global game state management

utils/
├── StorageUtils.js  # AsyncStorage wrapper
└── GameLogic.js     # 2048 game engine

hooks/
└── useFrameworkReady.js  # Framework initialization
```

### State Management
- **Context API** for global game state
- **useReducer** for complex state transitions
- **AsyncStorage** for data persistence
- **Local state** for component-specific UI

### Game Logic
- **Move validation** with proper tile sliding mechanics
- **Merge detection** preventing chain-merges in single moves
- **Win/lose conditions** with comprehensive board analysis
- **Score calculation** with real-time updates
- **Animation coordination** preventing input during transitions

## 🛠️ Development

### Adding New Screens
1. Create new file in `app/` directory
2. Export default React component
3. Add navigation links in appropriate parent screens
4. Update navigation types if using TypeScript

### Adding New Features
1. **Game mechanics**: Extend `utils/GameLogic.js`
2. **Storage**: Add methods to `utils/StorageUtils.js`
3. **State**: Update `contexts/GameContext.js` reducer
4. **UI components**: Create in `components/` directory

### Testing
- **Manual testing** on iOS, Android, and Web
- **Game logic tests** using provided test vectors
- **Storage tests** for data persistence
- **Navigation tests** for deep linking

## 🔧 Configuration

### Environment Variables
- No external APIs required
- All data stored locally
- Theme and settings managed in-app

### Platform-Specific Code
- **Haptics**: iOS/Android only
- **Keyboard**: Web-specific arrow key handling
- **Gestures**: Mobile-optimized swipe detection

## 📊 Game Statistics

The app tracks comprehensive statistics:
- **Max Level**: Highest tile value achieved
- **Max Score**: Best game score ever
- **Max Time**: Fastest time to reach 2048
- **Game History**: Last 50 games with full details
- **Performance Metrics**: Moves per second, efficiency ratings

## 🎨 Design System

### Colors
- **Primary**: `#667eea` (Purple-blue)
- **Secondary**: `#f093fb` (Pink)
- **Success**: `#10b981` (Green)
- **Warning**: `#f59e0b` (Orange)
- **Error**: `#ef4444` (Red)
- **Neutral**: Gray scale from `#f8fafc` to `#1e293b`

### Typography
- **Headers**: Bold, 24-28px
- **Body**: Regular, 14-16px
- **Captions**: Medium, 12-14px
- **Line height**: 1.5x for body, 1.2x for headers

### Spacing
- **Base unit**: 8px
- **Component padding**: 16-20px
- **Section margins**: 20-24px
- **Element gaps**: 8-12px

## 🚀 Next Steps

Here are concrete follow-up tasks to enhance the game:

1. **Cloud Sync**: Implement user accounts with cross-device game syncing
2. **Rich Animations**: Add particle effects, smoother tile transitions, and celebratory animations
3. **Daily Challenges**: Create time-limited puzzles with special objectives and rewards
4. **Achievement System**: Add badges for milestones (first 512, win in under 5 minutes, etc.)
5. **Analytics Integration**: Track user behavior and game completion rates
6. **Keyboard Remapping**: Allow custom key bindings for web users
7. **Accessibility Polish**: Add screen reader support, high contrast mode, and larger touch targets
8. **Internationalization**: Add multi-language support for global audiences

## 📄 License

MIT License - feel free to use this code for your own projects!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on all platforms
5. Submit a pull request

---

**Enjoy playing 2048!** 🎮