import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '../constants/theme';
import { purchaseRemoveAds, restorePurchases } from '../services/iap';

export default function RemoveAdsButton() {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      await purchaseRemoveAds();
      // purchaseUpdatedListener in iap.ts will handle granting ad-free
    } catch {
      Alert.alert(
        '\u05e9\u05d2\u05d9\u05d0\u05d4',
        '\u05dc\u05d0 \u05d4\u05e6\u05dc\u05d7\u05e0\u05d5 \u05dc\u05d4\u05e9\u05dc\u05d9\u05dd \u05d0\u05ea \u05d4\u05e8\u05db\u05d9\u05e9\u05d4. \u05e0\u05e1\u05d5 \u05e9\u05d5\u05d1.'
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        Alert.alert('', '\u05d4\u05e8\u05db\u05d9\u05e9\u05d4 \u05e9\u05d5\u05d7\u05d6\u05e8\u05d4 \u05d1\u05d4\u05e6\u05dc\u05d7\u05d4!');
      } else {
        Alert.alert('', '\u05dc\u05d0 \u05e0\u05de\u05e6\u05d0\u05d5 \u05e8\u05db\u05d9\u05e9\u05d5\u05ea \u05e7\u05d5\u05d3\u05de\u05d5\u05ea.');
      }
    } catch {
      Alert.alert(
        '\u05e9\u05d2\u05d9\u05d0\u05d4',
        '\u05dc\u05d0 \u05d4\u05e6\u05dc\u05d7\u05e0\u05d5 \u05dc\u05e9\u05d7\u05d6\u05e8 \u05e8\u05db\u05d9\u05e9\u05d5\u05ea.'
      );
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.purchaseButton, isPurchasing && styles.disabled]}
        onPress={handlePurchase}
        disabled={isPurchasing || isRestoring}
      >
        {isPurchasing ? (
          <ActivityIndicator color={theme.colors.background} size="small" />
        ) : (
          <Text style={styles.purchaseButtonText}>
            {'\u2728 \u05d4\u05e1\u05e8 \u05e4\u05e8\u05e1\u05d5\u05de\u05d5\u05ea \u2014 \u20aa34.90 / $9.99'}
          </Text>
        )}
      </Pressable>

      <Pressable
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={isPurchasing || isRestoring}
      >
        {isRestoring ? (
          <ActivityIndicator color={theme.colors.textSecondary} size="small" />
        ) : (
          <Text style={styles.restoreText}>
            {'\u05e9\u05d7\u05d6\u05e8 \u05e8\u05db\u05d9\u05e9\u05d5\u05ea'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  purchaseButton: {
    backgroundColor: '#DAA520',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  disabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  restoreButton: {
    paddingVertical: theme.spacing.sm,
  },
  restoreText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    textDecorationLine: 'underline',
  },
});
