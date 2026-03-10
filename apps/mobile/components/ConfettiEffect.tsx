import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARTICLE_COUNT = 40;
const COLORS = [
  '#e2b714',
  '#0a9396',
  '#ee9b00',
  '#00b894',
  '#ff6b6b',
  '#fdcb6e',
  '#e74c3c',
  '#3498db',
  '#9b59b6',
  '#2ecc71',
];

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  opacity: Animated.Value;
  size: number;
  color: string;
  startX: number;
  isSquare: boolean;
}

export default function ConfettiEffect() {
  const particles = useRef<Particle[]>([]);

  if (particles.current.length === 0) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const startX = Math.random() * SCREEN_WIDTH;
      particles.current.push({
        x: new Animated.Value(startX),
        y: new Animated.Value(-20),
        rotation: new Animated.Value(0),
        opacity: new Animated.Value(1),
        size: 6 + Math.random() * 10,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        startX,
        isSquare: Math.random() > 0.5,
      });
    }
  }

  useEffect(() => {
    const animations = particles.current.map((particle) => {
      const duration = 2500 + Math.random() * 1500;
      const drift = (Math.random() - 0.5) * SCREEN_WIDTH * 0.6;

      return Animated.parallel([
        Animated.timing(particle.y, {
          toValue: SCREEN_HEIGHT + 20,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.x, {
          toValue: particle.startX + drift,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.rotation, {
          toValue: 360 * (1 + Math.random() * 3),
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration,
          delay: duration * 0.6,
          useNativeDriver: true,
        }),
      ]);
    });

    const staggered = animations.map((anim, index) =>
      Animated.sequence([
        Animated.delay(index * 30),
        anim,
      ])
    );

    Animated.parallel(staggered).start();
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.current.map((particle, index) => {
        const rotate = particle.rotation.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg'],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                width: particle.size,
                height: particle.size,
                borderRadius: particle.isSquare ? 2 : particle.size / 2,
                backgroundColor: particle.color,
                opacity: particle.opacity,
                transform: [
                  { translateX: particle.x },
                  { translateY: particle.y },
                  { rotate },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  particle: {
    position: 'absolute',
  },
});
