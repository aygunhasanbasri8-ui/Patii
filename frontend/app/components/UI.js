import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../theme/tokens';

export function Card({ children, style, soft = false }) {
  return <View style={[styles.card, soft && styles.cardSoft, style]}>{children}</View>;
}

export function Badge({ label, tone = 'primary' }) {
  return (
    <View style={[styles.badge, toneStyles[tone].badge]}>
      <Text style={[styles.badgeText, toneStyles[tone].text]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, description }) {
  return (
    <View style={styles.empty}>
      {icon}
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
    </View>
  );
}

export function SectionHeader({ title, action }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  cardSoft: {
    backgroundColor: colors.surfaceSoft,
    shadowOpacity: 0,
    elevation: 0,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...typography.caption,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
});

const toneStyles = {
  primary: StyleSheet.create({
    badge: { backgroundColor: colors.surfaceSoft },
    text: { color: colors.primaryDark },
  }),
  success: StyleSheet.create({
    badge: { backgroundColor: colors.successSoft },
    text: { color: colors.success },
  }),
  danger: StyleSheet.create({
    badge: { backgroundColor: colors.dangerSoft },
    text: { color: colors.danger },
  }),
  info: StyleSheet.create({
    badge: { backgroundColor: colors.infoSoft },
    text: { color: colors.info },
  }),
};
