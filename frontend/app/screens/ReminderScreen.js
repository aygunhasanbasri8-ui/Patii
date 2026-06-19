import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useHeaderHeight } from '@react-navigation/elements';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../components/Button';
import Input from '../components/Input';
import { Badge, EmptyState, SectionHeader } from '../components/UI';
import { colors, radius, shadow, spacing, typography } from '../theme/tokens';

const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/;

export function isValidReminderDate(value) {
  return DATE_RE.test(value);
}

function parseDate(str) {
  if (!str || !DATE_RE.test(str)) return new Date();
  const [day, month, year] = str.split('/').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function ReminderRow({ reminder, onDelete, onEdit, past = false }) {
  const [title, ...rest] = reminder.text.split(': ');
  const description = rest.join(': ');
  return (
    <View style={[styles.reminderCard, past && styles.reminderCardPast]}>
      <View style={styles.reminderTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reminderTitle}>{title}</Text>
          {description ? <Text style={styles.reminderDescription}>{description}</Text> : null}
        </View>
        <Badge label={reminder.date} tone={past ? 'danger' : 'primary'} />
      </View>
      {!past ? (
        <View style={styles.actionRow}>
          {onEdit ? (
            <TouchableOpacity style={styles.actionLink} onPress={() => onEdit(reminder)}>
              <Ionicons name="create-outline" size={14} color={colors.primaryDark} />
              <Text style={styles.editLinkText}>Düzenle</Text>
            </TouchableOpacity>
          ) : null}
          {onDelete ? (
            <TouchableOpacity style={styles.actionLink} onPress={() => onDelete(reminder.id)}>
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
              <Text style={styles.deleteLinkText}>Sil</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function ReminderScreen({
  selectedPet,
  reminders,
  history,
  form,
  setForm,
  onAdd,
  onUpdate,
  onCancelEdit,
  editingId,
  onDelete,
  onEdit,
  onLoadHistory,
  historyLoaded,
  loading,
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const headerHeight = useHeaderHeight();

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setForm((p) => ({ ...p, remind_at: formatDate(selectedDate) }));
    }
  };

  if (!selectedPet) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon={<Ionicons name="notifications-outline" size={44} color={colors.primaryLight} />}
          title="Önce bir pati seç"
          description="Hatırlatıcı eklemek için Profil sekmesinden bir pati seç."
        />
      </View>
    );
  }

  const isEditing = !!editingId;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Hatırlatıcılar</Text>
        <Text style={styles.subtitle}>{selectedPet.name} için aşı, ilaç ve randevuları takip et.</Text>

        <View style={styles.formCard}>
          {isEditing ? (
            <View style={styles.editingBanner}>
              <Ionicons name="create-outline" size={14} color={colors.primaryDark} />
              <Text style={styles.editingBannerText}>Hatırlatıcı düzenleniyor</Text>
            </View>
          ) : null}
          <Input
            label="Başlık"
            placeholder="Örn: Kuduz Aşısı"
            value={form.title}
            onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
          />
          <Input
            label="Açıklama"
            placeholder="Örn: Yıllık tekrar dozu"
            value={form.description}
            onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
          />

          <View style={styles.dateFieldWrapper}>
            <Text style={styles.dateFieldLabel}>Tarih</Text>
            <TouchableOpacity
              style={styles.dateFieldBox}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.75}
            >
              <Text style={[styles.dateFieldText, !form.remind_at && styles.dateFieldPlaceholder]}>
                {form.remind_at || 'Tarih seç…'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={parseDate(form.remind_at)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}

          <Button
            title={isEditing ? 'Güncelle' : 'Hatırlatıcı Ekle'}
            loading={loading}
            style={{ marginTop: spacing.lg }}
            onPress={isEditing ? onUpdate : onAdd}
          />
          {isEditing ? (
            <Button title="Vazgeç" variant="ghost" style={{ marginTop: spacing.xs }} onPress={onCancelEdit} />
          ) : null}
        </View>

        <SectionHeader title="Aktif Hatırlatıcılar" />
        {reminders.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="checkmark-circle-outline" size={40} color={colors.success} />}
            title="Aktif hatırlatıcı yok"
            description="Yukarıdan yeni bir hatırlatıcı ekleyebilirsin."
          />
        ) : (
          reminders.map((r) => <ReminderRow key={r.id} reminder={r} onDelete={onDelete} onEdit={onEdit} />)
        )}

        <SectionHeader
          title="Geçmiş"
          action={
            !historyLoaded ? (
              <TouchableOpacity onPress={onLoadHistory}>
                <Text style={styles.loadHistoryLink}>Getir</Text>
              </TouchableOpacity>
            ) : null
          }
        />
        {!historyLoaded ? (
          <Text style={styles.subtitle}>Geçmiş kayıtları görmek için &quot;Getir&quot;e dokun.</Text>
        ) : history.length === 0 ? (
          <Text style={styles.subtitle}>Geçmiş kayıt yok.</Text>
        ) : (
          history.map((r) => <ReminderRow key={`h-${r.id}`} reminder={r} past />)
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  emptyContainer: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl, backgroundColor: colors.background, flexGrow: 1 },
  title: { ...typography.display, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.md },
  formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  reminderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  reminderCardPast: {
    backgroundColor: colors.surfaceMuted,
    shadowOpacity: 0,
    elevation: 0,
  },
  reminderTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  reminderTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  reminderDescription: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.lg },
  actionLink: { flexDirection: 'row', alignItems: 'center' },
  deleteLinkText: { ...typography.caption, color: colors.danger, marginLeft: 4 },
  editLinkText: { ...typography.caption, color: colors.primaryDark, marginLeft: 4 },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  editingBannerText: { ...typography.caption, color: colors.primaryDark, marginLeft: spacing.xs },
  loadHistoryLink: { ...typography.bodyStrong, color: colors.primaryDark },
  dateFieldWrapper: { marginTop: spacing.md },
  dateFieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    backgroundColor: colors.surface,
  },
  dateFieldText: { fontSize: 15, color: colors.textPrimary },
  dateFieldPlaceholder: { color: colors.textMuted },
});
