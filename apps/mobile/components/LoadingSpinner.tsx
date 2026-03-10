import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { HEBREW_LETTERS } from '../constants/categories';
import { theme } from '../constants/theme';

interface LoadingSpinnerProps {
  text?: string;
  size?: number;
}

export default function LoadingSpinner({
  text,
  size = 48,
}: LoadingSpinnerProps) {
  const [letterIndex, setLetterIndex] = useState(0);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      setLetterIndex((prev) => (prev + 1) % HEBREW_LETTERS.length);
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.letterCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ rotate }],
          },
        ]}
      >
        <Animated.Text
          style={[
            styles.letter,
            {
              fontSize: size * 0.5,
              opacity: opacityAnim,
            },
          ]}
        >
          {HEBREW_LETTERS[letterIndex]}
        </Animated.Text>
      </Animated.View>
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  letterCircle: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceLight,
  },
  letter: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  text: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
});
