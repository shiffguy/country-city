import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { theme } from '../constants/theme';
import { Answer, ValidationStatus } from '../store/gameStore';
import PlayerAvatar from './PlayerAvatar';

interface VoteCardProps {
  answer: Answer;
  onVote?: (answerId: string, vote: 'for' | 'against') => void;
  currentUserId?: string;
  showVoteButtons?: boolean;
}

function getStatusBadge(status: ValidationStatus): {
  text: string;
  color: string;
  bg: string;
} {
  switch (status) {
    case 'approved':
      return {
        text: '\u05d0\u05d5\u05e9\u05e8',
        color: theme.colors.success,
        bg: theme.colors.success + '22',
      };
    case 'rejected':
      return {
        text: '\u05e0\u05d3\u05d7\u05d4',
        color: theme.colors.error,
        bg: theme.colors.error + '22',
      };
    case 'challenged':
      return {
        text: '\u05de\u05d5\u05e2\u05de\u05d3/\u05ea',
        color: theme.colors.primary,
        bg: theme.colors.primary + '22',
      };
    default:
      return {
        text: '\u05d1\u05d1\u05d3\u05d9\u05e7\u05d4',
        color: theme.colors.textSecondary,
        bg: theme.colors.cardBg,
      };
  }
}

export default function VoteCard({
  answer,
  onVote,
  currentUserId,
  showVoteButtons = false,
}: VoteCardProps) {
  const badge = getStatusBadge(answer.status);
  const isChallenged = answer.status === 'challenged';
  const isRejected = answer.status === 'rejected';
  const isOwnAnswer = answer.playerId === currentUserId;
  const hasVoted = answer.myVote !== null && answer.myVote !== undefined;

  return (
    <View
      style={[
        styles.card,
        isChallenged && styles.challengedCard,
        isRejected && styles.rejectedCard,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.playerInfo}>
          <PlayerAvatar nickname={answer.playerNickname} size={32} />
          <Text style={styles.nickname}>{answer.playerNickname}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>
            {badge.text}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.answerText,
          isRejected && styles.rejectedText,
        ]}
      >
        {answer.text || '-'}
      </Text>

      {isChallenged && showVoteButtons && !isOwnAnswer && (
        <View style={styles.voteContainer}>
          <Pressable
            style={[
              styles.voteButton,
              styles.voteFor,
              answer.myVote === 'for' && styles.voteActive,
            ]}
            onPress={() => onVote?.(answer.id, 'for')}
            disabled={hasVoted}
          >
            <Text style={styles.voteEmoji}>{'\ud83d\udc4d'}</Text>
            <Text style={styles.voteCount}>{answer.votesFor}</Text>
          </Pressable>
          <Pressable
            style={[
              styles.voteButton,
              styles.voteAgainst,
              answer.myVote === 'against' && styles.voteActive,
            ]}
            onPress={() => onVote?.(answer.id, 'against')}
            disabled={hasVoted}
          >
            <Text style={styles.voteEmoji}>{'\ud83d\udc4e'}</Text>
            <Text style={styles.voteCount}>{answer.votesAgainst}</Text>
          </Pressable>
        </View>
      )}

      {isChallenged && !showVoteButtons && (
        <View style={styles.voteContainer}>
          <View style={[styles.voteDisplay, styles.voteFor]}>
            <Text style={styles.voteEmoji}>{'\ud83d\udc4d'}</Text>
            <Text style={styles.voteCount}>{answer.votesFor}</Text>
          </View>
          <View style={[styles.voteDisplay, styles.voteAgainst]}>
            <Text style={styles.voteEmoji}>{'\ud83d\udc4e'}</Text>
            <Text style={styles.voteCount}>{answer.votesAgainst}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  challengedCard: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  rejectedCard: {
    borderColor: theme.colors.error,
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  playerInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  nickname: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  badgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
  },
  answerText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    textAlign: 'right',
    fontWeight: '500',
  },
  rejectedText: {
    textDecorationLine: 'line-through',
    color: theme.colors.error,
  },
  voteContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  voteDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  voteFor: {
    backgroundColor: theme.colors.success + '22',
  },
  voteAgainst: {
    backgroundColor: theme.colors.error + '22',
  },
  voteActive: {
    borderWidth: 2,
    borderColor: theme.colors.text,
  },
  voteEmoji: {
    fontSize: 18,
  },
  voteCount: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
  },
});
