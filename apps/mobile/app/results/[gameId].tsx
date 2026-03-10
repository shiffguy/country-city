import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../../constants/theme';
import { useGameStore } from '../../store/gameStore';
import PlayerAvatar from '../../components/PlayerAvatar';
import ConfettiEffect from '../../components/ConfettiEffect';
import BannerAd from '../../components/BannerAd';
import { showInterstitial } from '../../services/ads';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PODIUM_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

interface PodiumColumnProps {
  nickname: string;
  score: number;
  rank: number;
  height: number;
  color: string;
  delay: number;
}

function PodiumColumn({
  nickname,
  score,
  rank,
  height,
  color,
  delay,
}: PodiumColumnProps) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(heightAnim, {
          toValue: height,
          friction: 6,
          tension: 40,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      if (rank === 1) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });
  }, []);

  const medals = ['', '\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'];

  return (
    <View style={styles.podiumColumnContainer}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.podiumAvatar}>
          <PlayerAvatar nickname={nickname} size={48} />
        </View>
        <Text style={styles.podiumMedal}>{medals[rank] || ''}</Text>
        <Text style={styles.podiumNickname} numberOfLines={1}>
          {nickname}
        </Text>
        <Text style={styles.podiumScore}>{score}</Text>
      </Animated.View>
      <Animated.View
        style={[
          styles.podiumBar,
          {
            height: heightAnim,
            backgroundColor: color,
          },
        ]}
      >
        <Text style={styles.podiumRank}>{rank}</Text>
      </Animated.View>
    </View>
  );
}

export default function ResultsScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const { currentGame, leaveGame, roundScores } = useGameStore();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  // Show interstitial ad when entering results (between games)
  useEffect(() => {
    showInterstitial();
  }, []);

  const players = currentGame?.players
    ? [...currentGame.players].sort((a, b) => b.score - a.score)
    : [];

  const first = players[0];
  const second = players[1];
  const third = players[2];

  const handlePlayAgain = () => {
    leaveGame();
    router.replace('/');
    // Could also create new game with same config
  };

  const handleGoHome = () => {
    leaveGame();
    router.replace('/');
  };

  // Podium ordering: [2nd, 1st, 3rd] for visual layout
  const podiumOrder = [second, first, third].filter(Boolean);
  const podiumHeights = [120, 170, 90];
  const podiumColors = [PODIUM_COLORS.silver, PODIUM_COLORS.gold, PODIUM_COLORS.bronze];
  const podiumRanks = [2, 1, 3];
  const podiumDelays = [400, 0, 700];

  return (
    <LinearGradient
      colors={[theme.colors.background, '#0d0d1a', theme.colors.surface]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        {showConfetti && <ConfettiEffect />}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={styles.title}>
            {'\u05e1\u05d9\u05d5\u05dd \u05d4\u05de\u05e9\u05d7\u05e7!'}
          </Text>

          {/* Podium */}
          <View style={styles.podium}>
            {podiumOrder.map((player, index) => {
              if (!player) return <View key={index} style={styles.podiumColumnContainer} />;
              return (
                <PodiumColumn
                  key={player.id}
                  nickname={player.nickname}
                  score={player.score}
                  rank={podiumRanks[index]}
                  height={podiumHeights[index]}
                  color={podiumColors[index]}
                  delay={podiumDelays[index]}
                />
              );
            })}
          </View>

          {/* Full Leaderboard */}
          <View style={styles.leaderboard}>
            <Text style={styles.leaderboardTitle}>
              {'\u05d8\u05d1\u05dc\u05ea \u05e0\u05d9\u05e7\u05d5\u05d3'}
            </Text>
            {players.map((player, index) => (
              <View
                key={player.id}
                style={[
                  styles.leaderboardRow,
                  index === 0 && styles.leaderboardFirst,
                ]}
              >
                <Text style={styles.leaderboardRank}>#{index + 1}</Text>
                <PlayerAvatar nickname={player.nickname} size={36} />
                <Text style={styles.leaderboardName}>{player.nickname}</Text>
                <Text style={styles.leaderboardScore}>{player.score}</Text>
              </View>
            ))}
          </View>

          {/* Round Breakdown Accordion */}
          <RoundBreakdown roundScores={roundScores} />

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <Pressable style={styles.playAgainButton} onPress={handlePlayAgain}>
              <Text style={styles.playAgainText}>
                {'\u05de\u05e9\u05d7\u05e7 \u05e0\u05d5\u05e1\u05e3'}
              </Text>
            </Pressable>
            <Pressable style={styles.homeButton} onPress={handleGoHome}>
              <Text style={styles.homeButtonText}>
                {'\u05d7\u05d6\u05e8\u05d4 \u05d4\u05d1\u05d9\u05ea\u05d4'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Banner Ad */}
        <BannerAd position="bottom" />
      </SafeAreaView>
    </LinearGradient>
  );
}

function RoundBreakdown({ roundScores }: { roundScores: { playerId: string; nickname: string; scores: Record<string, number>; roundTotal: number; gameTotal: number }[] }) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  if (!roundScores || roundScores.length === 0) return null;

  // Group by rounds (just display the last round scores for now)
  return (
    <View style={styles.breakdownContainer}>
      <Text style={styles.breakdownTitle}>
        {'\u05e4\u05d9\u05e8\u05d5\u05d8 \u05e0\u05d9\u05e7\u05d5\u05d3'}
      </Text>
      <Pressable
        style={styles.breakdownHeader}
        onPress={() =>
          setExpandedRound(expandedRound === 0 ? null : 0)
        }
      >
        <Text style={styles.breakdownHeaderText}>
          {'\u05e1\u05d9\u05d1\u05d5\u05d1 \u05d0\u05d7\u05e8\u05d5\u05df'}
        </Text>
        <Text style={styles.breakdownArrow}>
          {expandedRound === 0 ? '\u25b2' : '\u25bc'}
        </Text>
      </Pressable>
      {expandedRound === 0 && (
        <View style={styles.breakdownContent}>
          {roundScores.map((score) => (
            <View key={score.playerId} style={styles.breakdownRow}>
              <Text style={styles.breakdownPlayerName}>
                {score.nickname}
              </Text>
              <Text style={styles.breakdownPlayerScore}>
                +{score.roundTotal}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl * 2,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    textShadowColor: 'rgba(226, 183, 20, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },

  // ── Podium ──
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 280,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  podiumColumnContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  podiumAvatar: {
    marginBottom: theme.spacing.xs,
  },
  podiumMedal: {
    fontSize: 28,
    textAlign: 'center',
  },
  podiumNickname: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  podiumScore: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  podiumBar: {
    width: '80%',
    borderTopLeftRadius: theme.borderRadius.md,
    borderTopRightRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: theme.spacing.sm,
    minHeight: 10,
  },
  podiumRank: {
    color: 'rgba(0,0,0,0.6)',
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
  },

  // ── Leaderboard ──
  leaderboard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  leaderboardTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  leaderboardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  leaderboardFirst: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: theme.borderRadius.sm,
  },
  leaderboardRank: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    width: 30,
    textAlign: 'center',
  },
  leaderboardName: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    flex: 1,
    textAlign: 'right',
  },
  leaderboardScore: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },

  // ── Breakdown ──
  breakdownContainer: {
    marginBottom: theme.spacing.xl,
  },
  breakdownTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: theme.spacing.sm,
  },
  breakdownHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  breakdownHeaderText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  breakdownArrow: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  breakdownContent: {
    backgroundColor: theme.colors.surfaceLight,
    borderBottomLeftRadius: theme.borderRadius.md,
    borderBottomRightRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.colors.border,
  },
  breakdownRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  breakdownPlayerName: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
  },
  breakdownPlayerScore: {
    color: theme.colors.success,
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
  },

  // ── Buttons ──
  buttonsContainer: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  playAgainButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  playAgainText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  homeButton: {
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  homeButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.lg,
  },
});
