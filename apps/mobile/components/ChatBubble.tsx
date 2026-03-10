import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

interface ChatBubbleProps {
  message: string;
  nickname: string;
  isOwn: boolean;
  timestamp: number;
}

function formatTime(ts: number): string {
  const date = new Date(ts);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export default function ChatBubble({
  message,
  nickname,
  isOwn,
  timestamp,
}: ChatBubbleProps) {
  return (
    <View
      style={[
        styles.container,
        isOwn ? styles.ownContainer : styles.otherContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isOwn ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        {!isOwn && <Text style={styles.nickname}>{nickname}</Text>}
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.time}>{formatTime(timestamp)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  ownContainer: {
    alignItems: 'flex-start',
  },
  otherContainer: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  ownBubble: {
    backgroundColor: theme.colors.secondary + '33',
    borderBottomLeftRadius: theme.spacing.xs,
  },
  otherBubble: {
    backgroundColor: theme.colors.surfaceLight,
    borderBottomRightRadius: theme.spacing.xs,
  },
  nickname: {
    color: theme.colors.accent,
    fontSize: theme.fontSize.xs,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 2,
  },
  message: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  time: {
    color: theme.colors.textDark,
    fontSize: 10,
    textAlign: 'left',
    marginTop: 2,
  },
});
