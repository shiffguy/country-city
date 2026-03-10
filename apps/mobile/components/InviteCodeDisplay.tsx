import React from 'react';
import { View, Text, StyleSheet, Pressable, Share, Alert, Platform } from 'react-native';
import { theme } from '../constants/theme';

interface InviteCodeDisplayProps {
  code: string;
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    // Dynamic import for expo-clipboard if available, fallback to Share
    const Clipboard = require('expo-clipboard');
    if (Clipboard && Clipboard.setStringAsync) {
      await Clipboard.setStringAsync(text);
      return;
    }
  } catch {
    // expo-clipboard not available, use share as fallback
  }
  // Fallback: use share API
  await Share.share({ message: text });
}

export default function InviteCodeDisplay({ code }: InviteCodeDisplayProps) {
  const handleCopy = async () => {
    try {
      await copyToClipboard(code);
      Alert.alert('', '\u05d4\u05e7\u05d5\u05d3 \u05d4\u05d5\u05e2\u05ea\u05e7!');
    } catch {
      Alert.alert(
        '\u05e9\u05d2\u05d9\u05d0\u05d4',
        '\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05d4\u05e2\u05ea\u05d9\u05e7 \u05d0\u05ea \u05d4\u05e7\u05d5\u05d3'
      );
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `\u05d1\u05d5\u05d0\u05d5 \u05dc\u05e9\u05d7\u05e7 \u05d0\u05e8\u05e5 \u05e2\u05d9\u05e8! \u05e7\u05d5\u05d3 \u05d4\u05d6\u05de\u05e0\u05d4: ${code}`,
      });
    } catch {
      // User cancelled share
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {'\u05e7\u05d5\u05d3 \u05d4\u05d6\u05de\u05e0\u05d4'}
      </Text>
      <View style={styles.codeBox}>
        <Text style={styles.codeText}>{code}</Text>
      </View>
      <View style={styles.buttonRow}>
        <Pressable style={styles.button} onPress={handleCopy}>
          <Text style={styles.buttonEmoji}>{'\ud83d\udccb'}</Text>
          <Text style={styles.buttonText}>
            {'\u05d4\u05e2\u05ea\u05e7'}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.shareButton]}
          onPress={handleShare}
        >
          <Text style={styles.buttonEmoji}>{'\ud83d\udce4'}</Text>
          <Text style={styles.buttonText}>
            {'\u05e9\u05ea\u05e3'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  title: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.md,
  },
  codeBox: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceLight,
    borderStyle: 'dashed',
  },
  codeText: {
    color: theme.colors.primary,
    fontSize: 36,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 8,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row-reverse',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  button: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  shareButton: {
    backgroundColor: theme.colors.primary + '22',
    borderColor: theme.colors.primary,
  },
  buttonEmoji: {
    fontSize: 16,
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
});
