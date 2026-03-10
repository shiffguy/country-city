import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

interface PlayerAvatarProps {
  nickname: string;
  size?: number;
  isOnline?: boolean;
  isHost?: boolean;
}

const AVATAR_COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#e91e63',
  '#00bcd4',
  '#8bc34a',
];

function hashNickname(nickname: string): number {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    const char = nickname.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export default function PlayerAvatar({
  nickname,
  size = 48,
  isOnline,
  isHost,
}: PlayerAvatarProps) {
  const colorIndex = hashNickname(nickname) % AVATAR_COLORS.length;
  const bgColor = AVATAR_COLORS[colorIndex];
  const initial = nickname.charAt(0);
  const fontSize = size * 0.45;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
          },
        ]}
      >
        <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
      </View>
      {isOnline !== undefined && (
        <View
          style={[
            styles.onlineDot,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              backgroundColor: isOnline
                ? theme.colors.success
                : theme.colors.textDark,
              right: 0,
              bottom: 0,
            },
          ]}
        />
      )}
      {isHost && (
        <View
          style={[
            styles.hostBadge,
            {
              width: size * 0.35,
              height: size * 0.35,
              borderRadius: size * 0.175,
              top: -size * 0.08,
              right: -size * 0.08,
            },
          ]}
        >
          <Text style={[styles.crownEmoji, { fontSize: size * 0.2 }]}>
            {'\u{1F451}'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  onlineDot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  hostBadge: {
    position: 'absolute',
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownEmoji: {
    textAlign: 'center',
  },
});
