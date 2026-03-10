import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { ALL_CATEGORIES, Category } from '../../constants/categories';
import { useGameStore, GamePhase, Answer, RoundScore } from '../../store/gameStore';
import CircularTimer from '../../components/CircularTimer';
import CategoryInput from '../../components/CategoryInput';
import LetterWheel from '../../components/LetterWheel';
import VoteCard from '../../components/VoteCard';
import ScorePopup from '../../components/ScorePopup';
import PlayerAvatar from '../../components/PlayerAvatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ROUND_TOTAL_TIME = 60;

// ─── Stop Countdown Overlay ─────────────────────────────────────
function StopCountdownOverlay({ timeRemaining, stopCalledBy, players }: {
  timeRemaining: number;
  stopCalledBy: string | null;
  players: { id: string; nickname: string }[];
}) {
  const pulseAnim = useRef(new Animated.Value(0.8)).current;
  const callerName = players.find((p) => p.id === stopCalledBy)?.nickname || '';

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={[styles.stopOverlay, { opacity: pulseAnim }]}>
      <LinearGradient
        colors={['rgba(255, 107, 107, 0.9)', 'rgba(255, 107, 107, 0.7)']}
        style={styles.stopOverlayGradient}
      >
        <Text style={styles.stopOverlayTitle}>
          {'\u05e1\u05d8\u05d5\u05e4!'}
        </Text>
        {callerName ? (
          <Text style={styles.stopOverlaySubtitle}>
            {callerName}{' \u05e7\u05e8\u05d0 \u05e1\u05d8\u05d5\u05e4'}
          </Text>
        ) : null}
        <Text style={styles.stopOverlayTimer}>
          {timeRemaining}{' \u05e9\u05e0\u05d9\u05d5\u05ea \u05e0\u05d5\u05ea\u05e8\u05d5'}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Review Phase ────────────────────────────────────────────────
function ReviewPhase({
  reviewAnswers,
  categories,
  currentUserId,
  onVote,
}: {
  reviewAnswers: Answer[];
  categories: string[];
  currentUserId: string;
  onVote: (answerId: string, vote: 'for' | 'against') => void;
}) {
  return (
    <ScrollView
      style={styles.reviewScrollView}
      contentContainerStyle={styles.reviewContent}
      showsVerticalScrollIndicator={false}
    >
      {categories.map((catId) => {
        const cat = ALL_CATEGORIES.find((c) => c.id === catId);
        const catAnswers = reviewAnswers.filter((a) => a.category === catId);
        if (catAnswers.length === 0) return null;

        return (
          <View key={catId} style={styles.reviewCategorySection}>
            <Text style={styles.reviewCategoryTitle}>
              {cat ? `${cat.emoji} ${cat.label}` : catId}
            </Text>
            {catAnswers.map((answer) => (
              <VoteCard
                key={answer.id}
                answer={answer}
                onVote={onVote}
                currentUserId={currentUserId}
                showVoteButtons={answer.status === 'challenged'}
              />
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Round Results Phase ─────────────────────────────────────────
function RoundResultsPhase({
  roundScores,
  categories,
  onNext,
}: {
  roundScores: RoundScore[];
  categories: string[];
  onNext: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(onNext, 8000);
    return () => clearTimeout(timer);
  }, []);

  const sorted = [...roundScores].sort((a, b) => b.gameTotal - a.gameTotal);

  return (
    <Animated.View style={[styles.resultsContainer, { opacity: fadeAnim }]}>
      <ScrollView
        contentContainerStyle={styles.resultsContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.resultsTitle}>
          {'\u05ea\u05d5\u05e6\u05d0\u05d5\u05ea \u05e1\u05d9\u05d1\u05d5\u05d1'}
        </Text>
        {sorted.map((score, index) => (
          <View key={score.playerId} style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultRank}>#{index + 1}</Text>
              <PlayerAvatar nickname={score.nickname} size={36} />
              <Text style={styles.resultName}>{score.nickname}</Text>
              <View style={styles.resultScores}>
                <Text style={styles.resultRoundScore}>
                  +{score.roundTotal}
                </Text>
                <Text style={styles.resultTotalScore}>
                  {'\u05e1\u05d4\u05f4\u05db: '}{score.gameTotal}
                </Text>
              </View>
            </View>
            <View style={styles.resultCategories}>
              {categories.map((catId) => {
                const catScore = score.scores[catId] ?? 0;
                const type =
                  catScore >= 10
                    ? 'unique'
                    : catScore >= 5
                      ? 'duplicate'
                      : 'invalid';
                return (
                  <View key={catId} style={styles.resultCategoryScore}>
                    <Text style={styles.resultCategoryLabel}>
                      {ALL_CATEGORIES.find((c) => c.id === catId)?.emoji || ''}
                    </Text>
                    <ScorePopup score={catScore} type={type} />
                  </View>
                );
              })}
            </View>
          </View>
        ))}
        <Pressable style={styles.nextRoundButton} onPress={onNext}>
          <Text style={styles.nextRoundButtonText}>
            {'\u05d4\u05e1\u05d9\u05d1\u05d5\u05d1 \u05d4\u05d1\u05d0'}
          </Text>
        </Pressable>
      </ScrollView>
    </Animated.View>
  );
}

// ─── Main Game Screen ────────────────────────────────────────────
export default function GameScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const {
    currentGame,
    user,
    answers,
    reviewAnswers,
    roundScores,
    setAnswer,
    submitAnswers,
    callStop,
    vote,
  } = useGameStore();

  const [showLetterWheel, setShowLetterWheel] = useState(false);
  const [lastRevealedRound, setLastRevealedRound] = useState(0);
  const stopButtonScale = useRef(new Animated.Value(1)).current;

  // Show letter wheel on new round
  useEffect(() => {
    if (
      currentGame?.phase === 'PLAYING' &&
      currentGame.currentRound > lastRevealedRound &&
      currentGame.currentLetter
    ) {
      setShowLetterWheel(true);
      setLastRevealedRound(currentGame.currentRound);
    }
  }, [currentGame?.phase, currentGame?.currentRound]);

  // Navigate to results when finished
  useEffect(() => {
    if (currentGame?.phase === 'FINISHED' && gameId) {
      router.replace(`/results/${gameId}`);
    }
  }, [currentGame?.phase]);

  // Auto-submit when stopped phase ends (time runs out)
  useEffect(() => {
    if (currentGame?.phase === 'STOPPED' && currentGame.timeRemaining <= 0) {
      submitAnswers();
    }
  }, [currentGame?.phase, currentGame?.timeRemaining]);

  const handleLetterWheelComplete = useCallback(() => {
    setTimeout(() => setShowLetterWheel(false), 500);
  }, []);

  const handleStopPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.sequence([
      Animated.timing(stopButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(stopButtonScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    callStop();
  };

  const handleVote = (answerId: string, voteType: 'for' | 'against') => {
    vote(answerId, voteType);
  };

  const handleNextRound = () => {
    // Server will auto-advance
  };

  if (!currentGame || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {'\u05d8\u05d5\u05e2\u05df...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const phase = currentGame.phase;
  const isPlaying = phase === 'PLAYING' || phase === 'STOPPED';
  const isReview = phase === 'REVIEW' || phase === 'VOTING';
  const isRoundResults = phase === 'ROUND_RESULTS';

  const gameCategories: Category[] = currentGame.categories
    .map((catId) => ALL_CATEGORIES.find((c) => c.id === catId))
    .filter((c): c is Category => c !== undefined);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Header Bar ─────────────────────────── */}
        <View style={styles.headerBar}>
          {/* Round indicator (right in RTL) */}
          <View style={styles.roundIndicator}>
            <Text style={styles.roundText}>
              {'\u05e1\u05d9\u05d1\u05d5\u05d1'}
            </Text>
            <Text style={styles.roundNumber}>
              {currentGame.currentRound}/{currentGame.totalRounds}
            </Text>
          </View>

          {/* Letter circle (center) */}
          <View style={styles.letterContainer}>
            <View style={styles.letterCircle}>
              <Text style={styles.letterText}>
                {currentGame.currentLetter || '?'}
              </Text>
            </View>
          </View>

          {/* Timer (left in RTL) */}
          <CircularTimer
            totalTime={ROUND_TOTAL_TIME}
            timeRemaining={currentGame.timeRemaining}
            size={56}
          />
        </View>

        {/* ── Phase: PLAYING / STOPPED → Category Inputs ── */}
        {isPlaying && (
          <>
            <ScrollView
              style={styles.inputsScrollView}
              contentContainerStyle={styles.inputsContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {gameCategories.map((cat) => (
                <CategoryInput
                  key={cat.id}
                  category={cat}
                  value={answers[cat.id] || ''}
                  onChange={(text) => setAnswer(cat.id, text)}
                  disabled={phase !== 'PLAYING'}
                />
              ))}
              {/* Extra padding for stop button */}
              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Stop Button */}
            {phase === 'PLAYING' && (
              <Animated.View
                style={[
                  styles.stopButtonContainer,
                  { transform: [{ scale: stopButtonScale }] },
                ]}
              >
                <Pressable onPress={handleStopPress}>
                  <LinearGradient
                    colors={[theme.colors.error, '#cc4444']}
                    style={styles.stopButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.stopButtonText}>
                      {'\ud83d\uded1 \u05e1\u05d8\u05d5\u05e4!'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            )}

            {/* Stop Countdown Overlay */}
            {phase === 'STOPPED' && (
              <StopCountdownOverlay
                timeRemaining={currentGame.timeRemaining}
                stopCalledBy={currentGame.stopCalledBy}
                players={currentGame.players}
              />
            )}
          </>
        )}

        {/* ── Phase: REVIEW / VOTING ────────────── */}
        {isReview && (
          <ReviewPhase
            reviewAnswers={reviewAnswers}
            categories={currentGame.categories}
            currentUserId={user.id}
            onVote={handleVote}
          />
        )}

        {/* ── Phase: ROUND_RESULTS ──────────────── */}
        {isRoundResults && (
          <RoundResultsPhase
            roundScores={roundScores}
            categories={currentGame.categories}
            onNext={handleNextRound}
          />
        )}

        {/* ── Letter Reveal Overlay ─────────────── */}
        {showLetterWheel && currentGame.currentLetter && (
          <LetterWheel
            letter={currentGame.currentLetter}
            onComplete={handleLetterWheelComplete}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.lg,
  },

  // ── Header ──
  headerBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  roundIndicator: {
    alignItems: 'center',
  },
  roundText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
  },
  roundNumber: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  letterContainer: {
    alignItems: 'center',
  },
  letterCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 3,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: 'bold',
  },

  // ── Category Inputs ──
  inputsScrollView: {
    flex: 1,
  },
  inputsContent: {
    padding: theme.spacing.lg,
  },

  // ── Stop Button ──
  stopButtonContainer: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
  },
  stopButton: {
    paddingVertical: theme.spacing.md + 2,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    shadowColor: theme.colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  stopButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
  },

  // ── Stop Overlay ──
  stopOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  stopOverlayGradient: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  stopOverlayTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
  },
  stopOverlaySubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: theme.fontSize.md,
    marginTop: 2,
  },
  stopOverlayTimer: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
  },

  // ── Review Phase ──
  reviewScrollView: {
    flex: 1,
  },
  reviewContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  reviewCategorySection: {
    marginBottom: theme.spacing.lg,
  },
  reviewCategoryTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },

  // ── Round Results ──
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  resultsTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  resultCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  resultHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  resultRank: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    width: 30,
    textAlign: 'center',
  },
  resultName: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  resultScores: {
    alignItems: 'center',
  },
  resultRoundScore: {
    color: theme.colors.success,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  resultTotalScore: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
  },
  resultCategories: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  resultCategoryScore: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  resultCategoryLabel: {
    fontSize: 18,
  },
  nextRoundButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  nextRoundButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
});
