import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../components/Button';
import Input from '../components/Input';
import PetSwitcher from '../components/PetSwitcher';
import { EmptyState, SectionHeader } from '../components/UI';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function ProfileScreen({
  pets,
  selectedIndex,
  onSelectPet,
  draftPet,
  setDraftPet,
  onAddDraftPet,
  onSavePet,
  onDeletePet,
  isNewPet,
  loading,
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Patilerim</Text>
      <Text style={styles.subtitle}>Profilleri yönet, yenisini ekle.</Text>

      {pets.length > 0 ? (
        <PetSwitcher pets={pets} selectedIndex={selectedIndex} onSelect={onSelectPet} onAddPress={onAddDraftPet} />
      ) : null}

      <SectionHeader title={isNewPet ? 'Yeni Pati' : 'Pati Bilgileri'} />

      <View style={styles.formCard}>
        <Input
          label="Ad"
          placeholder="Örn: Boncuk"
          value={draftPet.name}
          onChangeText={(v) => setDraftPet((p) => ({ ...p, name: v }))}
        />
        <Input
          label="Tür"
          placeholder="Örn: Kedi"
          value={draftPet.species}
          onChangeText={(v) => setDraftPet((p) => ({ ...p, species: v }))}
        />
        <Input
          label="Cins"
          placeholder="Örn: Tekir"
          value={draftPet.breed}
          onChangeText={(v) => setDraftPet((p) => ({ ...p, breed: v }))}
        />

        <Button
          title={isNewPet ? 'Patiyi Kaydet' : 'Değişiklikleri Kaydet'}
          loading={loading}
          style={{ marginTop: spacing.lg }}
          onPress={onSavePet}
        />
        {!isNewPet && pets.length > 0 ? (
          <Button
            title="Patiyi Sil"
            variant="danger"
            style={{ marginTop: spacing.sm }}
            onPress={onDeletePet}
            icon={<Ionicons name="trash-outline" size={16} color={colors.danger} />}
          />
        ) : null}
      </View>

      {pets.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="paw-outline" size={44} color={colors.primaryLight} />}
          title="Henüz pati eklenmedi"
          description="Yukarıdaki formu doldurup ilk patini ekleyebilirsin."
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl, backgroundColor: colors.background, flexGrow: 1 },
  title: { ...typography.display, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.md },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
