import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import { ALL_CATEGORIES } from '../../constants/categories';
import { useGameStore } from '../../store/gameStore';
import PlayerAvatar from '../../components/PlayerAvatar';
import InviteCodeDisplay from '../../components/InviteCodeDisplay';
import ChatBubble from '../../components/ChatBubble';
import LoadingSpinner from '../../components/LoadingSpinner';
import BannerAd from '../../components/BannerAd';

interface AnimatedPlayerItemProps {
  player: {
    id: string;
    nickname: string;
    avatarUrl: string | null;
    rating: number;
    score: number;
    isHost: boolean;
    isOnline: boolean;
  };
  index: number;
}

function AnimatedPlayerItem({ player, index }: AnimatedPlayerItemProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.playerCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <PlayerAvatar
        nickname={player.nickname}
        size={44}
        isOnline={player.isOnline}
        isHost={player.isHost}
      />
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{player.nickname}</Text>
        <Text style={styles.playerRating}>
          {'\u2b50 '}{player.rating}
        </Text>
      </View>
      {player.isHost && (
        <View style={styles.hostBadge}>
          <Text style={styles.hostBadgeText}>
            {'\u05de\u05d0\u05e8\u05d7'}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

function AnimatedDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 300),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      )
    );
    Animated.parallel(animations).start();
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.dotsContainer}>
      {dots.map((dot, i) => (
        <Animated.Text
          key={i}
          style={[styles.dot, { opacity: dot }]}
        >
          .
        </Animated.Text>
      ))}
    </View>
  );
}

export default function LobbyScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const {
    currentGame,
    user,
    chatMessages,
    startGame,
    leaveGame,
    sendChat,
  } = useGameStore();

  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const chatListRef = useRef<FlatList>(null);

  // Navigate to game screen when round starts
  useEffect(() => {
    if (currentGame?.phase === 'PLAYING' && gameId) {
      router.replace(`/game/${gameId}`);
    }
  }, [currentGame?.phase]);

  const handleSendChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    sendChat(trimmed);
    setChatInput('');
  };

  const handleLeave = () => {
    leaveGame();
    router.back();
  };

  const handleStart = () => {
    startGame();
  };

  if (!currentGame) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner text={'\u05d8\u05d5\u05e2\u05df \u05de\u05e9\u05d7\u05e7...'} />
      </SafeAreaView>
    );
  }

  const isHost = currentGame.players.some(
    (p) => p.id === user?.id && p.isHost
  );
  const canStart = isHost && currentGame.players.length >= 2;
  const categoryLabels = currentGame.categories.map((catId) => {
    const cat = ALL_CATEGORIES.find((c) => c.id === catId);
    return cat ? `${cat.emoji} ${cat.label}` : catId;
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleLeave}>
            <Text style={styles.backButtonText}>{'\u2190'}</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor:
                    currentGame.type === 'private'
                      ? theme.colors.primary + '22'
                      : theme.colors.secondary + '22',
                },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  {
                    color:
                      currentGame.type === 'private'
                        ? theme.colors.primary
                        : theme.colors.secondary,
                  },
                ]}
              >
                {currentGame.type === 'private'
                  ? '\u05e4\u05e8\u05d8\u05d9'
                  : '\u05e6\u05d9\u05d1\u05d5\u05e8\u05d9'}
              </Text>
            </View>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Game Info */}
        <View style={styles.infoCard}>
          <View style={styles.categoryBadges}>
            {categoryLabels.map((label, i) => (
              <View key={i} style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>
              {currentGame.totalRounds}{' \u05e1\u05d9\u05d1\u05d5\u05d1\u05d9\u05dd'}
            </Text>
            <Text style={styles.infoDivider}>{'|'}</Text>
            <Text style={styles.infoText}>
              {currentGame.players.length}{'/'}
              {currentGame.type === 'private' ? '10' : '4'}
              {' \u05e9\u05d7\u05e7\u05e0\u05d9\u05dd'}
            </Text>
          </View>
        </View>

        {/* Invite Code (private games) */}
        {currentGame.type === 'private' && currentGame.inviteCode && (
          <InviteCodeDisplay code={currentGame.inviteCode} />
        )}

        {/* Public games waiting message */}
        {currentGame.type === 'public' && currentGame.players.length < 2 && (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>
              {'\u05de\u05de\u05ea\u05d9\u05e0\u05d9\u05dd \u05dc\u05e9\u05d7\u05e7\u05e0\u05d9\u05dd'}
            </Text>
            <AnimatedDots />
          </View>
        )}

        {/* Player List */}
        <View style={styles.playerListContainer}>
          <Text style={styles.sectionTitle}>
            {'\u05e9\u05d7\u05e7\u05e0\u05d9\u05dd'}
          </Text>
          <FlatList
            data={currentGame.players}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <AnimatedPlayerItem player={item} index={index} />
            )}
            contentContainerStyle={styles.playerList}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Chat Section */}
        <View style={styles.chatSection}>
          <Pressable
            style={styles.chatToggle}
            onPress={() => setShowChat(!showChat)}
          >
            <Text style={styles.chatToggleText}>
              {showChat
                ? '\u05d4\u05e1\u05ea\u05e8 \u05e6\u05d0\u05d8'
                : `\u05e6\u05d0\u05d8 (${chatMessages.length})`}
            </Text>
          </Pressable>

          {showChat && (
            <View style={styles.chatContainer}>
              <FlatList
                ref={chatListRef}
                data={chatMessages}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ChatBubble
                    message={item.text}
                    nickname={item.nickname}
                    isOwn={item.playerId === user?.id}
                    timestamp={item.timestamp}
                  />
                )}
                style={styles.chatList}
                contentContainerStyle={styles.chatListContent}
                onContentSizeChange={() =>
                  chatListRef.current?.scrollToEnd({ animated: true })
                }
                showsVerticalScrollIndicator={false}
              />
              <View style={styles.chatInputRow}>
                <Pressable
                  style={styles.chatSendButton}
                  onPress={handleSendChat}
                >
                  <Text style={styles.chatSendText}>{'\u25b6'}</Text>
                </Pressable>
                <TextInput
                  style={styles.chatInput}
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder={'\u05db\u05ea\u05d1\u05d5 \u05d4\u05d5\u05d3\u05e2\u05d4...'}
                  placeholderTextColor={theme.colors.textDark}
                  textAlign="right"
                  onSubmitEditing={handleSendChat}
                  returnKeyType="send"
                />
              </View>
            </View>
          )}
        </View>

        {/* Start Button (host only) */}
        {isHost && (
          <Pressable
            style={[
              styles.startButton,
              !canStart && styles.startButtonDisabled,
            ]}
            onPress={handleStart}
            disabled={!canStart}
          >
            <Text style={styles.startButtonText}>
              {canStart
                ? '\u05d4\u05ea\u05d7\u05dc \u05de\u05e9\u05d7\u05e7'
                : `\u05e6\u05e8\u05d9\u05da \u05dc\u05e4\u05d7\u05d5\u05ea 2 \u05e9\u05d7\u05e7\u05e0\u05d9\u05dd`}
            </Text>
          </Pressable>
        )}

        {!isHost && (
          <View style={styles.waitingForHost}>
            <Text style={styles.waitingForHostText}>
              {'\u05de\u05de\u05ea\u05d9\u05e0\u05d9\u05dd \u05dc\u05de\u05d0\u05e8\u05d7 \u05e9\u05d9\u05ea\u05d7\u05d9\u05dc...'}
            </Text>
          </View>
        )}

        {/* Banner Ad */}
        <BannerAd position="bottom" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  typeBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  typeBadgeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: theme.colors.cardBg,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryBadges: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  categoryBadge: {
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  categoryBadgeText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  infoText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
  },
  infoDivider: {
    color: theme.colors.textDark,
  },
  waitingContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  waitingText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginRight: theme.spacing.xs,
  },
  dot: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
  },
  playerListContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: theme.spacing.sm,
  },
  playerList: {
    gap: theme.spacing.sm,
  },
  playerCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  playerInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  playerName: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  playerRating: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: 2,
  },
  hostBadge: {
    backgroundColor: theme.colors.primary + '22',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  hostBadgeText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
  },
  chatSection: {
    paddingHorizontal: theme.spacing.lg,
  },
  chatToggle: {
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  chatToggleText: {
    color: theme.colors.secondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  chatContainer: {
    height: 200,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    padding: theme.spacing.sm,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
  },
  chatInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    textAlign: 'right',
  },
  chatSendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendText: {
    color: theme.colors.text,
    fontSize: 14,
  },
  startButton: {
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: theme.colors.textDark,
    opacity: 0.5,
  },
  startButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
  waitingForHost: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  waitingForHostText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
  },
});
