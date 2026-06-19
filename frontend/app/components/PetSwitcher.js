import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

function speciesIcon(species) {
  const s = (species || '').toLowerCase();
  if (s.includes('kedi')) return 'paw';
  if (s.includes('köpek') || s.includes('kopek')) return 'paw';
  if (s.includes('kuş') || s.includes('kus')) return 'logo-twitter';
  return 'paw';
}

export default function PetSwitcher({ pets, selectedIndex, onSelect, onAddPress }) {
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
      {onAddPress ? (
        <TouchableOpacity style={styles.addChip} onPress={onAddPress} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color={colors.primaryDark} />
        </TouchableOpacity>
      ) : null}
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
  addChip: {
    width: 38,
    height: 38,
    borderRadius: radius.circle,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
});
