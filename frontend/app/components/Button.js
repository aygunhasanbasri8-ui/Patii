import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../theme/tokens';

// variant: 'primary' | 'secondary' | 'danger' | 'ghost'
export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  icon,
}) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.base, variantStyles[variant].container, isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].text.color} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, variantStyles[variant].text, icon && { marginLeft: spacing.sm }]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  text: {
    ...typography.button,
  },
  disabled: {
    opacity: 0.5,
  },
});

const variantStyles = {
  primary: StyleSheet.create({
    container: { backgroundColor: colors.primary, ...shadow.card },
    text: { color: colors.textOnPrimary },
  }),
  secondary: StyleSheet.create({
    container: { backgroundColor: colors.surfaceSoft },
    text: { color: colors.primaryDark },
  }),
  danger: StyleSheet.create({
    container: { backgroundColor: colors.dangerSoft },
    text: { color: colors.danger },
  }),
  ghost: StyleSheet.create({
    container: { backgroundColor: 'transparent', paddingVertical: 10 },
    text: { color: colors.textSecondary },
  }),
};
