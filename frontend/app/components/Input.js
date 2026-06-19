import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'sentences',
  keyboardType,
  returnKeyType,
  multiline = false,
  editable = true,
  style,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          !editable && styles.inputDisabled,
          multiline && styles.multiline,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        multiline={multiline}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryXLight,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
});
