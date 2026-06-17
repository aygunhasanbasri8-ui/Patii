import { Ionicons } from '@expo/vector-icons';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState, SectionHeader } from '../components/UI';
import PawMark from '../components/PawMark';
import PetSwitcher from '../components/PetSwitcher';
import { colors, radius, shadow, spacing, typography } from '../theme/tokens';

function StatPill({ icon, label, value, tone = 'primary' }) {
  return (
    <View style={[styles.statPill, toneBg[tone]]}>
      <View style={[styles.statIconWrap, toneIconBg[tone]]}>
        <Ionicons name={icon} size={18} color={toneIconColor[tone]} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const toneBg = {
  primary: { backgroundColor: colors.surfaceSoft },
  info: { backgroundColor: colors.infoSoft },
  success: { backgroundColor: colors.successSoft },
};
const toneIconBg = {
  primary: { backgroundColor: colors.primary },
  info: { backgroundColor: colors.info },
  success: { backgroundColor: colors.success },
};
const toneIconColor = { primary: '#fff', info: '#fff', success: '#fff' };

export default function HomeScreen({
  userName,
  pets,
  selectedIndex,
  onSelectPet,
  onAddPetPress,
  selectedPet,
  upcomingReminders,
  refreshing,
  onRefresh,
}) {
  const firstName = (userName || '').split(' ')[0];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Merhaba{firstName ? `, ${firstName}` : ''} 👋</Text>
          <Text style={styles.subGreeting}>Bugün patilerinin günü nasıl gidiyor?</Text>
        </View>
        <PawMark size={48} iconRatio={0.55} />
      </View>

      {pets.length > 0 ? (
        <>
          <PetSwitcher pets={pets} selectedIndex={selectedIndex} onSelect={onSelectPet} onAddPress={onAddPetPress} />

          {selectedPet ? (
            <View style={styles.petHero}>
              <Text style={styles.petHeroName}>{selectedPet.name}</Text>
              <Text style={styles.petHeroMeta}>
                {selectedPet.breed ? `${selectedPet.breed} · ` : ''}
                {selectedPet.species}
              </Text>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <StatPill icon="paw" label="Toplam Pati" value={pets.length} tone="primary" />
            <StatPill icon="notifications" label="Yaklaşan" value={upcomingReminders.length} tone="info" />
            <StatPill icon="checkmark-done" label="Aktif" value={pets.length > 0 ? 'Evet' : 'Hayır'} tone="success" />
          </View>

          <SectionHeader title="Yaklaşan Hatırlatıcılar" />
          {upcomingReminders.length === 0 ? (
            <View style={styles.emptyReminders}>
              <Ionicons name="checkmark-circle-outline" size={28} color={colors.success} />
              <Text style={styles.emptyRemindersText}>Şu an bekleyen bir hatırlatıcı yok.</Text>
            </View>
          ) : (
            upcomingReminders.slice(0, 4).map((r) => (
              <View key={r.id} style={styles.reminderRow}>
                <View style={styles.reminderIconWrap}>
                  <Ionicons name="alarm-outline" size={18} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reminderText} numberOfLines={1}>{r.text}</Text>
                  <Text style={styles.reminderDate}>{r.date}</Text>
                </View>
              </View>
            ))
          )}
        </>
      ) : (
        <EmptyState
          icon={<Ionicons name="paw-outline" size={48} color={colors.primaryLight} />}
          title="Henüz bir pati eklemedin"
          description="Profil sekmesinden ilk patini ekleyerek başla."
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl, backgroundColor: colors.background, flexGrow: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  greeting: { ...typography.title, color: colors.textPrimary },
  subGreeting: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  petHero: { marginTop: spacing.lg },
  petHeroName: { ...typography.display, color: colors.textPrimary },
  petHeroMeta: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  statPill: { flex: 1, borderRadius: radius.lg, padding: spacing.md, alignItems: 'flex-start' },
  statIconWrap: { width: 30, height: 30, borderRadius: radius.circle, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  statValue: { ...typography.title, color: colors.textPrimary, fontSize: 18 },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  emptyReminders: { alignItems: 'center', paddingVertical: spacing.xl, backgroundColor: colors.surfaceSoft, borderRadius: radius.lg },
  emptyRemindersText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  reminderIconWrap: {
    width: 36, height: 36, borderRadius: radius.circle,
    backgroundColor: colors.surfaceSoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  reminderText: { ...typography.bodyStrong, color: colors.textPrimary },
  reminderDate: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
