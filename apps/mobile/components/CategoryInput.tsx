import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Animated } from 'react-native';
import { theme } from '../constants/theme';
import { ValidationStatus } from '../store/gameStore';

interface CategoryInputProps {
  category: {
    id: string;
    label: string;
    emoji: string;
  };
  value: string;
  onChange: (text: string) => void;
  disabled?: boolean;
  validationStatus?: ValidationStatus;
}

function getStatusIcon(status?: ValidationStatus): {
  icon: string;
  color: string;
} {
  switch (status) {
    case 'approved':
      return { icon: '\u2713', color: theme.colors.success };
    case 'rejected':
      return { icon: '\u2717', color: theme.colors.error };
    case 'checking':
      return { icon: '\u23f3', color: theme.colors.warning };
    case 'challenged':
      return { icon: '?', color: theme.colors.primary };
    default:
      return { icon: '', color: 'transparent' };
  }
}

export default function CategoryInput({
  category,
  value,
  onChange,
  disabled = false,
  validationStatus,
}: CategoryInputProps) {
  const statusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (validationStatus && validationStatus !== 'pending') {
      Animated.sequence([
        Animated.timing(statusAnim, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(statusAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      statusAnim.setValue(0);
    }
  }, [validationStatus]);

  const { icon, color } = getStatusIcon(validationStatus);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{category.emoji}</Text>
        <Text style={styles.label}>{category.label}</Text>
        {validationStatus && validationStatus !== 'pending' && (
          <Animated.View
            style={[
              styles.statusBadge,
              {
                backgroundColor: color + '22',
                borderColor: color,
                transform: [{ scale: statusAnim }],
              },
            ]}
          >
            <Text style={[styles.statusIcon, { color }]}>{icon}</Text>
          </Animated.View>
        )}
      </View>
      <TextInput
        style={[
          styles.input,
          disabled && styles.inputDisabled,
          validationStatus === 'rejected' && styles.inputRejected,
          validationStatus === 'approved' && styles.inputApproved,
        ]}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        placeholder="..."
        placeholderTextColor={theme.colors.textDark}
        textAlign="right"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  emoji: {
    fontSize: 20,
    marginLeft: theme.spacing.sm,
  },
  label: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
    color: theme.colors.text,
    fontSize: theme.fontSize.lg,
    textAlign: 'right',
    writingDirection: 'rtl',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputDisabled: {
    opacity: 0.5,
  },
  inputRejected: {
    borderColor: theme.colors.error,
    textDecorationLine: 'line-through',
  },
  inputApproved: {
    borderColor: theme.colors.success,
  },
});
