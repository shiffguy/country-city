import React, { useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import {
  BannerAd as GADBannerAd,
  BannerAdSize,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../services/ads';
import { useGameStore } from '../store/gameStore';

interface BannerAdProps {
  position?: 'top' | 'bottom';
  style?: ViewStyle;
}

export default function BannerAd({ position = 'bottom', style }: BannerAdProps) {
  const isAdFree = useGameStore((s) => s.isAdFree);
  const [hasError, setHasError] = useState(false);

  // Don't render anything if user purchased ad removal or ad failed
  if (isAdFree || hasError) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        position === 'top' ? styles.top : styles.bottom,
        style,
      ]}
    >
      <GADBannerAd
        unitId={AD_UNIT_IDS.BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error) => {
          console.warn('[BannerAd] Failed to load:', error);
          setHasError(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  top: {
    // No extra styles needed
  },
  bottom: {
    // No extra styles needed
  },
});
