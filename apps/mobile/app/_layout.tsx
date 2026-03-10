import React, { useEffect } from 'react';
import { I18nManager, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { theme } from '../constants/theme';
import { initializeAds } from '../services/ads';
import { initIAP, restorePurchases, cleanupIAP } from '../services/iap';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function RootLayout() {
  useEffect(() => {
    // Initialize ads and IAP on app startup
    initializeAds();
    initIAP().then(() => {
      // Restore purchases to check if user already removed ads
      restorePurchases();
    });

    return () => {
      cleanupIAP();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'slide_from_left',
        }}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
