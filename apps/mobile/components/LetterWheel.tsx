import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { HEBREW_LETTERS } from '../constants/categories';
import { theme } from '../constants/theme';

interface LetterWheelProps {
  letter: string;
  onComplete?: () => void;
}

export default function LetterWheel({ letter, onComplete }: LetterWheelProps) {
  const [displayLetter, setDisplayLetter] = useState(HEBREW_LETTERS[0]);
  const [isRevealed, setIsRevealed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let letterIndex = 0;
    let interval = 50;
    let timeoutId: ReturnType<typeof setTimeout>;
    let totalElapsed = 0;
    const totalDuration = 2500;

    const cycle = () => {
      if (totalElapsed >= totalDuration) {
        setDisplayLetter(letter);
        setIsRevealed(true);

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        Animated.sequence([
          Animated.spring(scaleAnim, {
            toValue: 1.4,
            friction: 3,
            tension: 200,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 100,
            useNativeDriver: true,
          }),
        ]).start();

        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }).start();

        setTimeout(() => {
          onComplete?.();
        }, 800);
        return;
      }

      const progress = totalElapsed / totalDuration;
      interval = 50 + progress * 200;

      letterIndex = (letterIndex + 1) % HEBREW_LETTERS.length;
      setDisplayLetter(HEBREW_LETTERS[letterIndex]);

      if (progress > 0.7) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      totalElapsed += interval;
      timeoutId = setTimeout(cycle, interval);
    };

    timeoutId = setTimeout(cycle, interval);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [letter]);

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(226, 183, 20, 0)', 'rgba(226, 183, 20, 0.4)'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: opacityAnim,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.glowCircle,
            {
              backgroundColor: glowColor,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.letterCircle,
            {
              transform: [{ scale: scaleAnim }],
              borderColor: isRevealed
                ? theme.colors.primary
                : theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.letter,
              {
                color: isRevealed
                  ? theme.colors.primary
                  : theme.colors.text,
              },
            ]}
          >
            {displayLetter}
          </Text>
        </Animated.View>
        {!isRevealed && (
          <Text style={styles.hint}>
            {'\u05d1\u05d5\u05d7\u05e8\u05d9\u05dd \u05d0\u05d5\u05ea...'}
          </Text>
        )}
        {isRevealed && (
          <Text style={styles.revealedText}>
            {'\u05d4\u05d0\u05d5\u05ea '}
            <Text style={styles.revealedLetter}>{letter}</Text>
            {'!'}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 15, 35, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  letterCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surfaceLight,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 60,
    fontWeight: 'bold',
  },
  hint: {
    marginTop: 24,
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  revealedText: {
    marginTop: 24,
    fontSize: theme.fontSize.xl,
    color: theme.colors.text,
    fontWeight: '600',
  },
  revealedLetter: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: theme.fontSize.xxl,
  },
});
