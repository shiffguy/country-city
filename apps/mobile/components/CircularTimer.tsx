import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../constants/theme';

interface CircularTimerProps {
  totalTime: number;
  timeRemaining: number;
  size?: number;
}

export default function CircularTimer({
  totalTime,
  timeRemaining,
  size = 60,
}: CircularTimerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? timeRemaining / totalTime : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const getColor = (): string => {
    if (timeRemaining > 20) return theme.colors.success;
    if (timeRemaining > 10) return theme.colors.warning;
    return theme.colors.error;
  };

  useEffect(() => {
    if (timeRemaining <= 10 && timeRemaining > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [timeRemaining <= 10]);

  const timerColor = getColor();

  return (
    <Animated.View
      style={[
        styles.container,
        { width: size, height: size, transform: [{ scale: pulseAnim }] },
      ]}
    >
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={timerColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[styles.textContainer, { width: size, height: size }]}>
        <Text style={[styles.timeText, { color: timerColor, fontSize: size * 0.32 }]}>
          {timeRemaining}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontWeight: 'bold',
  },
});
