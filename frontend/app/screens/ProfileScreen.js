import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AvatarDisplay from '../components/AvatarDisplay';
import AvatarPicker from '../components/AvatarPicker';
import Button from '../components/Button';
import Input from '../components/Input';
import PetSwitcher from '../components/PetSwitcher';
import { EmptyState } from '../components/UI';
import { colors, radius, shadow, spacing, typography } from '../theme/tokens';

function ReadOnlyProfileCard({ pet, onEdit }) {
  return (
    <View style={styles.profileCard}>
      <TouchableOpacity style={styles.editIconBtn} onPress={onEdit} hitSlop={12}>
        <Ionicons name="create-outline" size={20} color={colors.primaryDark} />
      </TouchableOpacity>

      <AvatarDisplay
        avatarType={pet.avatar_type}
        avatarValue={pet.avatar_value}
        petName={pet.name}
        size={80}
        style={styles.profileAvatar}
      />

      <Text style={styles.profileName}>{pet.name}</Text>
      <Text style={styles.profileMeta}>
        {pet.breed ? `${pet.breed} · ` : ''}
        {pet.species}
      </Text>
    </View>
  );
}

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
  const [editMode, setEditMode] = useState(false);
  const headerHeight = useHeaderHeight();
  const selectedPet = pets[selectedIndex];

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    if (selectedPet) {
      setDraftPet({
        name: selectedPet.name || '',
        species: selectedPet.species || '',
        breed: selectedPet.breed || '',
        avatar_type: selectedPet.avatar_type || null,
        avatar_value: selectedPet.avatar_value || null,
      });
    }
  };

  const handleSave = async () => {
    await onSavePet();
    setEditMode(false);
  };

  const showForm = isNewPet || editMode;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Patilerim</Text>
        <Text style={styles.subtitle}>Profilleri yönet, yenisini ekle.</Text>

        {/* Pati seçici — "+" yok, sadece mevcut patiler arası geçiş */}
        {pets.filter((p) => p.id).length > 0 ? (
          <PetSwitcher
            pets={pets.filter((p) => p.id)}
            selectedIndex={selectedIndex}
            onSelect={(i) => {
              onSelectPet(i);
              setEditMode(false);
            }}
            onAddPress={null}
          />
        ) : null}

        {/* Salt-okunur profil kartı */}
        {!isNewPet && !editMode && selectedPet?.id ? (
          <ReadOnlyProfileCard pet={selectedPet} onEdit={handleEdit} />
        ) : null}

        {/* Form: yeni pati veya düzenleme modu */}
        {showForm ? (
          <View style={styles.formCard}>
            {isNewPet ? (
              <Text style={styles.formTitle}>Yeni Pati</Text>
            ) : (
              <View style={styles.formTitleRow}>
                <Text style={styles.formTitle}>Düzenle</Text>
                <TouchableOpacity onPress={handleCancelEdit}>
                  <Text style={styles.cancelLink}>Vazgeç</Text>
                </TouchableOpacity>
              </View>
            )}

            <AvatarPicker
              avatarType={draftPet.avatar_type}
              avatarValue={draftPet.avatar_value}
              petName={draftPet.name}
              onSelectIcon={(emoji) =>
                setDraftPet((p) => ({ ...p, avatar_type: 'icon', avatar_value: emoji }))
              }
              onSelectPhoto={(uri) =>
                setDraftPet((p) => ({ ...p, avatar_type: 'photo', avatar_value: uri }))
              }
            />

            <View style={styles.divider} />

            <Input
              label="Ad"
              placeholder="Örn: Boncuk"
              value={draftPet.name}
              onChangeText={(v) => setDraftPet((p) => ({ ...p, name: v }))}
              returnKeyType="next"
            />
            <Input
              label="Tür"
              placeholder="Örn: Kedi"
              value={draftPet.species}
              onChangeText={(v) => setDraftPet((p) => ({ ...p, species: v }))}
              returnKeyType="next"
            />
            <Input
              label="Cins"
              placeholder="Örn: Tekir"
              value={draftPet.breed}
              onChangeText={(v) => setDraftPet((p) => ({ ...p, breed: v }))}
              returnKeyType="done"
            />

            <Button
              title={isNewPet ? 'Patiyi Kaydet' : 'Değişiklikleri Kaydet'}
              loading={loading}
              style={{ marginTop: spacing.xl }}
              onPress={handleSave}
            />

            {!isNewPet ? (
              <>
                <View style={styles.actionDivider} />
                <Button
                  title="Patiyi Sil"
                  variant="danger"
                  onPress={onDeletePet}
                  icon={<Ionicons name="trash-outline" size={16} color={colors.danger} />}
                />
              </>
            ) : null}
          </View>
        ) : null}

        {/* Yeni Pati Ekle butonu — isNewPet veya editMode aktifken gizle */}
        {!isNewPet && !editMode ? (
          <TouchableOpacity style={styles.addPetCard} onPress={onAddDraftPet} activeOpacity={0.8}>
            <View style={styles.addPetIcon}>
              <Ionicons name="add" size={22} color={colors.primaryDark} />
            </View>
            <Text style={styles.addPetText}>Yeni Pati Ekle</Text>
          </TouchableOpacity>
        ) : null}

        {pets.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="paw-outline" size={44} color={colors.primaryLight} />}
            title="Henüz pati eklenmedi"
            description="Yukarıdaki formu doldurup ilk patini ekleyebilirsin."
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl, backgroundColor: colors.background, flexGrow: 1 },
  title: { ...typography.display, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.md },

  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadow.card,
  },
  editIconBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: radius.circle,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  profileName: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  profileMeta: { ...typography.body, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },

  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadow.card,
  },
  formTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  formTitle: { ...typography.subtitle, color: colors.textPrimary },
  cancelLink: { ...typography.bodyStrong, color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },
  actionDivider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },

  addPetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.md,
  },
  addPetIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.circle,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPetText: { ...typography.bodyStrong, color: colors.primaryDark },
});
