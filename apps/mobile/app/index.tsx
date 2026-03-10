import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Modal,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';
import { ALL_CATEGORIES, DEFAULT_CATEGORIES, Category } from '../constants/categories';
import { useGameStore } from '../store/gameStore';
import PlayerAvatar from '../components/PlayerAvatar';
import LoadingSpinner from '../components/LoadingSpinner';
import BannerAd from '../components/BannerAd';
import RemoveAdsButton from '../components/RemoveAdsButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function AnimatedTitle() {
  const glowAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.Text style={[styles.title, { opacity: glowAnim }]}>
      {'\u05d0\u05e8\u05e5 \u05e2\u05d9\u05e8'}
    </Animated.Text>
  );
}

interface GameCardProps {
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}

function GameCard({ emoji, title, subtitle, color, onPress }: GameCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <LinearGradient
          colors={[color + '33', color + '11']}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardContent}>
            <Text style={styles.cardEmoji}>{emoji}</Text>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </View>
          </View>
          <View style={[styles.cardAccent, { backgroundColor: color }]} />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    user,
    login,
    createGame,
    joinGame,
    joinMatchmaking,
    leaveMatchmaking,
    matchmakingStatus,
    currentGame,
    error,
    setError,
    isAdFree,
  } = useGameStore();

  const [nicknameInput, setNicknameInput] = useState('');
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [pendingAction, setPendingAction] = useState<'quick' | 'friends' | null>(null);

  // Game config
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    DEFAULT_CATEGORIES.map((c) => c.id)
  );
  const [totalRounds, setTotalRounds] = useState(5);
  const [maxPlayers, setMaxPlayers] = useState(4);

  // Navigate to lobby when game is created/joined
  useEffect(() => {
    if (currentGame) {
      setShowCreateModal(false);
      setShowJoinModal(false);
      setShowFriendsModal(false);
      router.push(`/lobby/${currentGame.id}`);
    }
  }, [currentGame?.id]);

  // Navigate when matchmaking finds a game
  useEffect(() => {
    if (matchmakingStatus === 'found' && currentGame) {
      router.push(`/lobby/${currentGame.id}`);
    }
  }, [matchmakingStatus, currentGame?.id]);

  const ensureLoggedIn = useCallback(
    (action: 'quick' | 'friends') => {
      if (!user) {
        setPendingAction(action);
        setShowNicknameModal(true);
        return false;
      }
      return true;
    },
    [user]
  );

  const handleLogin = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed || trimmed.length < 2) {
      Alert.alert('', '\u05d4\u05db\u05d9\u05e0\u05d5\u05d9 \u05e6\u05e8\u05d9\u05da \u05dc\u05d4\u05d9\u05d5\u05ea \u05dc\u05e4\u05d7\u05d5\u05ea 2 \u05ea\u05d5\u05d5\u05d9\u05dd');
      return;
    }
    setIsLoggingIn(true);
    try {
      await login(trimmed);
      setShowNicknameModal(false);
      if (pendingAction === 'quick') {
        handleQuickGame();
      } else if (pendingAction === 'friends') {
        setShowFriendsModal(true);
      }
      setPendingAction(null);
    } catch {
      // Error is set in store
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickGame = () => {
    if (!ensureLoggedIn('quick')) return;
    joinMatchmaking();
  };

  const handleFriendsGame = () => {
    if (!ensureLoggedIn('friends')) return;
    setShowFriendsModal(true);
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(catId)) {
        if (prev.length <= 2) return prev; // Minimum 2 categories
        return prev.filter((id) => id !== catId);
      }
      return [...prev, catId];
    });
  };

  const handleCreateGame = () => {
    createGame({
      categories: selectedCategories,
      totalRounds,
      maxPlayers,
      isPrivate: true,
    });
    setShowCreateModal(false);
  };

  const handleJoinWithCode = () => {
    const trimmed = joinCode.trim();
    if (!trimmed) {
      Alert.alert('', '\u05d9\u05e9 \u05dc\u05d4\u05db\u05e0\u05d9\u05e1 \u05e7\u05d5\u05d3');
      return;
    }
    joinGame(trimmed);
    setShowJoinModal(false);
  };

  const handleCancelMatchmaking = () => {
    leaveMatchmaking();
  };

  return (
    <LinearGradient
      colors={[theme.colors.background, theme.colors.surface]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          {user ? (
            <Pressable
              style={styles.profileButton}
              onPress={() => router.push('/profile')}
            >
              <PlayerAvatar nickname={user.nickname} size={40} />
            </Pressable>
          ) : (
            <View style={styles.profilePlaceholder} />
          )}
          {user && (
            <Text style={styles.welcomeText}>
              {'\u05d4\u05d9\u05d9, '}{user.nickname}{'!'}
            </Text>
          )}
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <AnimatedTitle />
          <Text style={styles.subtitle}>
            {'\u05d4\u05de\u05e9\u05d7\u05e7 \u05d4\u05e7\u05dc\u05d0\u05e1\u05d9 \u2014 \u05d0\u05d5\u05e0\u05dc\u05d9\u05d9\u05df!'}
          </Text>
        </View>

        {/* Game Cards */}
        <View style={styles.cardsSection}>
          {matchmakingStatus === 'searching' ? (
            <View style={styles.searchingContainer}>
              <LoadingSpinner
                text={'\u05de\u05d7\u05e4\u05e9\u05d9\u05dd \u05e9\u05d7\u05e7\u05e0\u05d9\u05dd...'}
              />
              <Pressable
                style={styles.cancelButton}
                onPress={handleCancelMatchmaking}
              >
                <Text style={styles.cancelButtonText}>
                  {'\u05d1\u05d9\u05d8\u05d5\u05dc'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <GameCard
                emoji={'\u26a1'}
                title={'\u05de\u05e9\u05d7\u05e7 \u05de\u05d4\u05d9\u05e8'}
                subtitle={'2-4 \u05e9\u05d7\u05e7\u05e0\u05d9\u05dd \u05d0\u05e7\u05e8\u05d0\u05d9\u05d9\u05dd'}
                color={theme.colors.secondary}
                onPress={handleQuickGame}
              />
              <GameCard
                emoji={'\ud83d\udc65'}
                title={'\u05de\u05e9\u05d7\u05e7 \u05d7\u05d1\u05e8\u05d9\u05dd'}
                subtitle={'\u05e2\u05d3 10 \u05e9\u05d7\u05e7\u05e0\u05d9\u05dd, \u05e7\u05d5\u05d3 \u05d4\u05d6\u05de\u05e0\u05d4'}
                color={theme.colors.primary}
                onPress={handleFriendsGame}
              />
            </>
          )}
        </View>

        {/* Remove Ads Button */}
        {user && !isAdFree && (
          <View style={styles.removeAdsContainer}>
            <RemoveAdsButton />
          </View>
        )}

        {/* Error display */}
        {error && (
          <Pressable style={styles.errorBanner} onPress={() => setError(null)}>
            <Text style={styles.errorText}>{error}</Text>
          </Pressable>
        )}

        {/* Nickname Modal */}
        <Modal
          visible={showNicknameModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowNicknameModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {'\u05d1\u05e8\u05d5\u05db\u05d9\u05dd \u05d4\u05d1\u05d0\u05d9\u05dd!'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {'\u05d0\u05d9\u05da \u05dc\u05e7\u05e8\u05d5\u05d0 \u05dc\u05da?'}
              </Text>
              <TextInput
                style={styles.nicknameInput}
                value={nicknameInput}
                onChangeText={setNicknameInput}
                placeholder={'\u05d4\u05db\u05e0\u05e1 \u05db\u05d9\u05e0\u05d5\u05d9'}
                placeholderTextColor={theme.colors.textDark}
                textAlign="right"
                autoFocus
                maxLength={20}
              />
              <Pressable
                style={[
                  styles.loginButton,
                  isLoggingIn && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <LoadingSpinner size={24} />
                ) : (
                  <Text style={styles.loginButtonText}>
                    {'\u05d1\u05d5\u05d0\u05d5 \u05e0\u05ea\u05d7\u05d9\u05dc!'}
                  </Text>
                )}
              </Pressable>
              <Pressable
                style={styles.closeModalButton}
                onPress={() => {
                  setShowNicknameModal(false);
                  setPendingAction(null);
                }}
              >
                <Text style={styles.closeModalText}>
                  {'\u05d1\u05d9\u05d8\u05d5\u05dc'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Friends Game Modal */}
        <Modal
          visible={showFriendsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFriendsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {'\u05de\u05e9\u05d7\u05e7 \u05d7\u05d1\u05e8\u05d9\u05dd'}
              </Text>

              <Pressable
                style={styles.friendsOption}
                onPress={() => {
                  setShowFriendsModal(false);
                  setShowCreateModal(true);
                }}
              >
                <Text style={styles.friendsOptionEmoji}>{'\ud83c\udfae'}</Text>
                <Text style={styles.friendsOptionText}>
                  {'\u05e6\u05d5\u05e8 \u05de\u05e9\u05d7\u05e7 \u05d7\u05d3\u05e9'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.friendsOption}
                onPress={() => {
                  setShowFriendsModal(false);
                  setShowJoinModal(true);
                }}
              >
                <Text style={styles.friendsOptionEmoji}>{'\ud83d\udd11'}</Text>
                <Text style={styles.friendsOptionText}>
                  {'\u05d4\u05e6\u05d8\u05e8\u05e3 \u05e2\u05dd \u05e7\u05d5\u05d3'}
                </Text>
              </Pressable>

              <Pressable
                style={styles.closeModalButton}
                onPress={() => setShowFriendsModal(false)}
              >
                <Text style={styles.closeModalText}>
                  {'\u05d1\u05d9\u05d8\u05d5\u05dc'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Create Game Modal */}
        <Modal
          visible={showCreateModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.createModalContent]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>
                  {'\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05de\u05e9\u05d7\u05e7'}
                </Text>

                {/* Categories */}
                <Text style={styles.configLabel}>
                  {'\u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d5\u05ea'}
                </Text>
                <View style={styles.categoriesGrid}>
                  {ALL_CATEGORIES.map((cat: Category) => {
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <Pressable
                        key={cat.id}
                        style={[
                          styles.categoryChip,
                          isSelected && styles.categoryChipSelected,
                        ]}
                        onPress={() => toggleCategory(cat.id)}
                      >
                        <Text style={styles.categoryChipEmoji}>
                          {cat.emoji}
                        </Text>
                        <Text
                          style={[
                            styles.categoryChipText,
                            isSelected && styles.categoryChipTextSelected,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Rounds */}
                <Text style={styles.configLabel}>
                  {'\u05e1\u05d9\u05d1\u05d5\u05d1\u05d9\u05dd: '}{totalRounds}
                </Text>
                <View style={styles.sliderRow}>
                  <Pressable
                    style={styles.sliderButton}
                    onPress={() => setTotalRounds(Math.max(1, totalRounds - 1))}
                  >
                    <Text style={styles.sliderButtonText}>-</Text>
                  </Pressable>
                  <View style={styles.sliderTrack}>
                    <View
                      style={[
                        styles.sliderFill,
                        { width: `${(totalRounds / 10) * 100}%` },
                      ]}
                    />
                  </View>
                  <Pressable
                    style={styles.sliderButton}
                    onPress={() =>
                      setTotalRounds(Math.min(10, totalRounds + 1))
                    }
                  >
                    <Text style={styles.sliderButtonText}>+</Text>
                  </Pressable>
                </View>

                {/* Max Players */}
                <Text style={styles.configLabel}>
                  {'\u05e9\u05d7\u05e7\u05e0\u05d9\u05dd: '}{maxPlayers}
                </Text>
                <View style={styles.sliderRow}>
                  <Pressable
                    style={styles.sliderButton}
                    onPress={() => setMaxPlayers(Math.max(2, maxPlayers - 1))}
                  >
                    <Text style={styles.sliderButtonText}>-</Text>
                  </Pressable>
                  <View style={styles.sliderTrack}>
                    <View
                      style={[
                        styles.sliderFill,
                        { width: `${(maxPlayers / 10) * 100}%` },
                      ]}
                    />
                  </View>
                  <Pressable
                    style={styles.sliderButton}
                    onPress={() => setMaxPlayers(Math.min(10, maxPlayers + 1))}
                  >
                    <Text style={styles.sliderButtonText}>+</Text>
                  </Pressable>
                </View>

                <Pressable style={styles.createButton} onPress={handleCreateGame}>
                  <Text style={styles.createButtonText}>
                    {'\u05e6\u05d5\u05e8 \u05de\u05e9\u05d7\u05e7!'}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.closeModalButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.closeModalText}>
                    {'\u05d1\u05d9\u05d8\u05d5\u05dc'}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Join with Code Modal */}
        <Modal
          visible={showJoinModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowJoinModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {'\u05d4\u05e6\u05d8\u05e8\u05e3 \u05dc\u05de\u05e9\u05d7\u05e7'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {'\u05d4\u05db\u05e0\u05e1 \u05d0\u05ea \u05e7\u05d5\u05d3 \u05d4\u05d4\u05d6\u05de\u05e0\u05d4'}
              </Text>
              <TextInput
                style={styles.codeInput}
                value={joinCode}
                onChangeText={setJoinCode}
                placeholder={'\u05e7\u05d5\u05d3 \u05de\u05e9\u05d7\u05e7'}
                placeholderTextColor={theme.colors.textDark}
                textAlign="center"
                autoCapitalize="characters"
                autoFocus
                maxLength={8}
              />
              <Pressable style={styles.joinButton} onPress={handleJoinWithCode}>
                <Text style={styles.joinButtonText}>
                  {'\u05d4\u05e6\u05d8\u05e8\u05e3!'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.closeModalButton}
                onPress={() => setShowJoinModal(false)}
              >
                <Text style={styles.closeModalText}>
                  {'\u05d1\u05d9\u05d8\u05d5\u05dc'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        {/* Banner Ad */}
        <BannerAd position="bottom" />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  profileButton: {
    borderRadius: 20,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
  },
  welcomeText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    flex: 1,
    textAlign: 'right',
  },
  titleSection: {
    alignItems: 'center',
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.hero,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    textShadowColor: 'rgba(226, 183, 20, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  removeAdsContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  cardsSection: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.lg,
    justifyContent: 'center',
    paddingBottom: theme.spacing.xxl * 2,
  },
  card: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardGradient: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  cardEmoji: {
    fontSize: 40,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'right',
  },
  cardSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  cardAccent: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopRightRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
  },
  searchingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
  },
  cancelButton: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  cancelButtonText: {
    color: theme.colors.error,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: theme.colors.error + '22',
    borderColor: theme.colors.error,
    borderWidth: 1,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
    fontSize: theme.fontSize.sm,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  createModalContent: {
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  modalSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  nicknameInput: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  closeModalButton: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  closeModalText: {
    color: theme.colors.textDark,
    fontSize: theme.fontSize.md,
  },
  friendsOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  friendsOptionEmoji: {
    fontSize: 28,
  },
  friendsOptionText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  configLabel: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  categoriesGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.cardBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.primary + '22',
    borderColor: theme.colors.primary,
  },
  categoryChipEmoji: {
    fontSize: 16,
  },
  categoryChipText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  categoryChipTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  sliderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.cardBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  createButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  codeInput: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 28,
    textAlign: 'center',
    fontFamily: 'monospace',
    letterSpacing: 6,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.lg,
  },
  joinButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  joinButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
});
