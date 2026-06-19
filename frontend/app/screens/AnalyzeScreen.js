import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Badge } from '../components/UI';
import { colors, radius, shadow, spacing, typography } from '../theme/tokens';

const LABEL_NAMES = {
  Ac: 'Aç',
  Huzursuz: 'Huzursuz',
  Sakin: 'Sakin/Mutlu',
  Belirsiz: 'Belirsiz',
  KediDegil: 'Kedi Sesi Değil',
};

function ProbabilityBars({ probabilities }) {
  if (!probabilities) return null;
  const entries = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);

  return (
    <View style={styles.probWrap}>
      <Text style={styles.probTitle}>Olasılık Dağılımı</Text>
      {entries.map(([label, value]) => (
        <View key={label} style={styles.probRow}>
          <Text style={styles.probLabel}>{LABEL_NAMES[label] || label}</Text>
          <View style={styles.probTrack}>
            <View style={[styles.probFill, { width: `${Math.round(value * 100)}%` }]} />
          </View>
          <Text style={styles.probValue}>%{Math.round(value * 100)}</Text>
        </View>
      ))}
    </View>
  );
}

export default function AnalyzeScreen({ selectedPet, result, recordingState, onToggleRecording }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const isRecording = recordingState === 'recording';
  const isUploading = recordingState === 'uploading';

  useEffect(() => {
    if (!isRecording) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 550, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 550, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording, pulse]);

  const hint = isRecording
    ? 'Dinleniyor… durdurmak için tekrar dokun'
    : isUploading
    ? 'Analiz ediliyor…'
    : 'Kayda başlamak için dokun';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ses Analizi</Text>
      <Text style={styles.subtitle}>
        {selectedPet ? `${selectedPet.name} ne hissediyor, dinleyelim.` : 'Önce Profil sekmesinden bir pati seç.'}
      </Text>

      <View style={styles.micWrap}>
        <Animated.View style={[styles.micRing, isRecording && styles.micRingActive, { transform: [{ scale: pulse }] }]} />
        <TouchableOpacity
          style={[styles.micButton, (!selectedPet || isUploading) && styles.micButtonDisabled, isRecording && styles.micButtonRecording]}
          onPress={onToggleRecording}
          disabled={!selectedPet || isUploading}
          activeOpacity={0.85}
        >
          {isUploading ? (
            <ActivityIndicator color={colors.textOnPrimary} size="large" />
          ) : (
            <Ionicons name={isRecording ? 'stop' : 'mic'} size={42} color={colors.textOnPrimary} />
          )}
        </TouchableOpacity>
        <Text style={styles.micHint}>{hint}</Text>
      </View>

      {result ? (
        <View style={styles.resultCard}>
          <View style={styles.resultHeaderRow}>
            <Badge label={result.status} tone="success" />
            {result.source ? (
              <Badge
                label={result.source === 'model' ? 'AI Modeli' : 'Genel Öneri'}
                tone={result.source === 'model' ? 'info' : 'primary'}
              />
            ) : null}
          </View>
          <Text style={styles.resultText}>{result.result}</Text>
          {result.advice ? <Text style={styles.adviceText}>{result.advice}</Text> : null}
          <View style={styles.confidenceRow}>
            <View style={styles.confidenceTrack}>
              <View style={[styles.confidenceFill, { width: `${Math.round((result.confidence || 0) * 100)}%` }]} />
            </View>
            <Text style={styles.confidenceLabel}>%{Math.round((result.confidence || 0) * 100)} güven</Text>
          </View>
          <ProbabilityBars probabilities={result.probabilities} />
        </View>
      ) : (
        <View style={styles.placeholderCard}>
          <Ionicons name="paw-outline" size={32} color={colors.primaryLight} />
          <Text style={styles.placeholderText}>Henüz analiz yapılmadı.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, paddingBottom: spacing.xxxl, backgroundColor: colors.background, flexGrow: 1, alignItems: 'center' },
  title: { ...typography.display, color: colors.textPrimary, alignSelf: 'flex-start' },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: 2, alignSelf: 'flex-start', marginBottom: spacing.xl },
  micWrap: { alignItems: 'center', marginVertical: spacing.xxl },
  micRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: radius.circle,
    backgroundColor: colors.surfaceSoft,
  },
  micRingActive: {
    backgroundColor: colors.dangerSoft,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: radius.circle,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.floating,
  },
  micButtonRecording: {
    backgroundColor: colors.danger,
  },
  micButtonDisabled: {
    backgroundColor: colors.primaryLight,
  },
  micHint: { ...typography.bodyStrong, color: colors.textSecondary, marginTop: spacing.lg },
  resultCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  resultHeaderRow: { flexDirection: 'row', gap: spacing.sm },
  resultText: { ...typography.title, color: colors.textPrimary, marginTop: spacing.md },
  adviceText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, gap: spacing.sm },
  confidenceTrack: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceSoft, overflow: 'hidden' },
  confidenceFill: { height: '100%', backgroundColor: colors.success, borderRadius: radius.pill },
  confidenceLabel: { ...typography.caption, color: colors.textSecondary },
  probWrap: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.surfaceSoft },
  probTitle: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  probRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs, gap: spacing.sm },
  probLabel: { ...typography.caption, color: colors.textPrimary, width: 80 },
  probTrack: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceSoft, overflow: 'hidden' },
  probFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },
  probValue: { ...typography.caption, color: colors.textSecondary, width: 36, textAlign: 'right' },
  placeholderCard: { alignItems: 'center', padding: spacing.xl },
  placeholderText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
});