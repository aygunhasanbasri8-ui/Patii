import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

function speciesIcon(species) {
  const s = (species || '').toLowerCase();
  // Kuş dışındaki her tür için pati ikonu yeterli
  if (s.includes('kuş') || s.includes('kus')) return 'logo-twitter';
  return 'paw';
}

export default function PetSwitcher({ pets, selectedIndex, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {pets.map((pet, i) => {
        const active = i === selectedIndex;
        return (
          <TouchableOpacity
            key={`${pet.id ?? 'new'}-${i}`}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(i)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={speciesIcon(pet.species)}
              size={15}
              color={active ? colors.textOnPrimary : colors.primaryDark}
              style={{ marginRight: spacing.xs }}
            />
            <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
              {pet.name || `Pati ${i + 1}`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: spacing.sm, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
    marginRight: spacing.sm,
    maxWidth: 160,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: { ...typography.bodyStrong, color: colors.primaryDark },
  chipTextActive: { color: colors.textOnPrimary },
});
