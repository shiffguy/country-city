import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';
import { useGameStore } from '../store/gameStore';
import PlayerAvatar from '../components/PlayerAvatar';
import RemoveAdsButton from '../components/RemoveAdsButton';

interface StatCardProps {
  label: string;
  value: string | number;
  emoji: string;
}

function StatCard({ label, value, emoji }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAdFree } = useGameStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState(user?.nickname || '');

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{'\u2190'}</Text>
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {'\u05dc\u05d0 \u05de\u05d7\u05d5\u05d1\u05e8'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const winRate =
    user.gamesPlayed > 0
      ? Math.round((user.wins / user.gamesPlayed) * 100)
      : 0;

  const handleSaveNickname = () => {
    const trimmed = editNickname.trim();
    if (trimmed.length < 2) {
      Alert.alert(
        '',
        '\u05d4\u05db\u05d9\u05e0\u05d5\u05d9 \u05e6\u05e8\u05d9\u05da \u05dc\u05d4\u05d9\u05d5\u05ea \u05dc\u05e4\u05d7\u05d5\u05ea 2 \u05ea\u05d5\u05d5\u05d9\u05dd'
      );
      return;
    }
    // In a real app, this would call the API to update nickname
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{'\u2190'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {'\u05e4\u05e8\u05d5\u05e4\u05d9\u05dc'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <PlayerAvatar nickname={user.nickname} size={100} />
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.nicknameInput}
              value={editNickname}
              onChangeText={setEditNickname}
              textAlign="center"
              autoFocus
              maxLength={20}
            />
            <View style={styles.editButtons}>
              <Pressable style={styles.saveButton} onPress={handleSaveNickname}>
                <Text style={styles.saveButtonText}>
                  {'\u05e9\u05de\u05d5\u05e8'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.cancelEditButton}
                onPress={() => {
                  setIsEditing(false);
                  setEditNickname(user.nickname);
                }}
              >
                <Text style={styles.cancelEditText}>
                  {'\u05d1\u05d9\u05d8\u05d5\u05dc'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setIsEditing(true)}>
            <Text style={styles.nickname}>{user.nickname}</Text>
            <Text style={styles.editHint}>
              {'\u05dc\u05d7\u05e5 \u05dc\u05e2\u05e8\u05d9\u05db\u05d4'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          label={'\u05d3\u05d9\u05e8\u05d5\u05d2'}
          value={user.rating}
          emoji={'\u2b50'}
        />
        <StatCard
          label={'\u05de\u05e9\u05d7\u05e7\u05d9\u05dd'}
          value={user.gamesPlayed}
          emoji={'\ud83c\udfae'}
        />
        <StatCard
          label={'\u05e0\u05d9\u05e6\u05d7\u05d5\u05e0\u05d5\u05ea'}
          value={user.wins}
          emoji={'\ud83c\udfc6'}
        />
        <StatCard
          label={'\u05d0\u05d7\u05d5\u05d6 \u05e0\u05d9\u05e6\u05d7\u05d5\u05e0\u05d5\u05ea'}
          value={`${winRate}%`}
          emoji={'\ud83d\udcca'}
        />
      </View>

      {/* Premium / Remove Ads Section */}
      <View style={styles.premiumSection}>
        {isAdFree ? (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>
              {'\u05e4\u05e8\u05d9\u05de\u05d9\u05d5\u05dd \u2728 \u2014 \u05dc\u05dc\u05d0 \u05e4\u05e8\u05e1\u05d5\u05de\u05d5\u05ea'}
            </Text>
          </View>
        ) : (
          <RemoveAdsButton />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  headerTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.lg,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  nickname: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  editHint: {
    color: theme.colors.textDark,
    fontSize: theme.fontSize.xs,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  editContainer: {
    alignItems: 'center',
    gap: theme.spacing.md,
    width: '80%',
  },
  nicknameInput: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: theme.fontSize.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    textAlign: 'center',
  },
  editButtons: {
    flexDirection: 'row-reverse',
    gap: theme.spacing.md,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  saveButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
  },
  cancelEditButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.textDark,
  },
  cancelEditText: {
    color: theme.colors.textDark,
    fontSize: theme.fontSize.md,
  },
  statsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
    justifyContent: 'center',
  },
  statCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    width: (SCREEN_WIDTH - theme.spacing.lg * 2 - theme.spacing.md) / 2 - 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statEmoji: {
    fontSize: 28,
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
  },
  statLabel: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  premiumSection: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
  },
  premiumBadge: {
    backgroundColor: 'rgba(218, 165, 32, 0.15)',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DAA520',
  },
  premiumBadgeText: {
    color: '#FFD700',
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
