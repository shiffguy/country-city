import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../constants/theme';

interface ScorePopupProps {
  score: number;
  type: 'unique' | 'duplicate' | 'invalid';
}

function getScoreDisplay(score: number, type: ScorePopupProps['type']): {
  text: string;
  color: string;
} {
  switch (type) {
    case 'unique':
      return { text: `+${score}`, color: theme.colors.success };
    case 'duplicate':
      return { text: `+${score}`, color: theme.colors.warning };
    case 'invalid':
      return { text: '+0', color: theme.colors.error };
    default:
      return { text: `+${score}`, color: theme.colors.textSecondary };
  }
}

export default function ScorePopup({ score, type }: ScorePopupProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const { text, color } = getScoreDisplay(score, type);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: color + '22',
          borderColor: color,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text style={[styles.text, { color }]}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  text: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
  },
});
