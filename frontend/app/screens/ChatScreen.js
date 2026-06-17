import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { EmptyState } from '../components/UI';
import { colors, radius, shadow, spacing, typography } from '../theme/tokens';

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowBot]}>
      {!isUser ? (
        <View style={styles.botAvatar}>
          <Ionicons name="paw" size={14} color={colors.textOnPrimary} />
        </View>
      ) : null}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{message.text}</Text>
      </View>
    </View>
  );
}

export default function ChatScreen({ messages, prompt, setPrompt, onSend, loading }) {
  const scrollRef = useRef(null);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <View style={styles.botAvatarLarge}>
          <Ionicons name="paw" size={18} color={colors.textOnPrimary} />
        </View>
        <View>
          <Text style={styles.headerTitle}>AI Bakım Asistanı</Text>
          <Text style={styles.headerSubtitle}>Beslenme, sağlık ve davranış soruları</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.primaryLight} />}
            title="Bir soru sor"
            description={'Örn: "Kedim tüy döküyor, normal mi?"'}
          />
        ) : (
          messages.map((m, i) => <MessageBubble key={`${m.role}-${i}`} message={m} />)
        )}
        {loading ? (
          <View style={[styles.bubbleRow, styles.bubbleRowBot]}>
            <View style={styles.botAvatar}>
              <Ionicons name="paw" size={14} color={colors.textOnPrimary} />
            </View>
            <View style={[styles.bubble, styles.bubbleBot]}>
              <Text style={styles.typingText}>yazıyor…</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.disclaimerWrap}>
        <Text style={styles.disclaimer}>Yapay zeka hatalı bilgi verebilir, tıbbi tavsiye yerine geçmez.</Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Mesajını yaz..."
          placeholderTextColor={colors.textMuted}
          value={prompt}
          onChangeText={setPrompt}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !prompt.trim() && styles.sendButtonDisabled]}
          onPress={onSend}
          disabled={!prompt.trim() || loading}
        >
          <Ionicons name="send" size={18} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  botAvatarLarge: {
    width: 38, height: 38, borderRadius: radius.circle,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  headerTitle: { ...typography.bodyStrong, color: colors.textPrimary, fontSize: 16 },
  headerSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  messages: { padding: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.md, maxWidth: '85%' },
  bubbleRowUser: { alignSelf: 'flex-end' },
  bubbleRowBot: { alignSelf: 'flex-start' },
  botAvatar: {
    width: 26, height: 26, borderRadius: radius.circle,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm, marginTop: 2,
  },
  bubble: { borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: 11, ...shadow.card },
  bubbleUser: { backgroundColor: colors.primary, borderTopRightRadius: 6 },
  bubbleBot: { backgroundColor: colors.surface, borderTopLeftRadius: 6 },
  bubbleText: { ...typography.body, color: colors.textPrimary, lineHeight: 20 },
  bubbleTextUser: { color: colors.textOnPrimary },
  typingText: { ...typography.body, color: colors.textSecondary, fontStyle: 'italic' },
  disclaimerWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  disclaimer: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    maxHeight: 100,
    color: colors.textPrimary,
    fontSize: 14,
  },
  sendButton: {
    width: 42, height: 42, borderRadius: radius.circle,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: colors.primaryLight },
});
