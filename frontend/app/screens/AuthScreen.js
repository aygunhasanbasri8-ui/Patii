import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../components/Button';
import Input from '../components/Input';
import PawMark from '../components/PawMark';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function AuthScreen({ onLogin, onRegister, loading }) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ full_name: '', email: '', password: '' });

  const isLogin = mode === 'login';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <PawMark size={72} />
          <Text style={styles.brand}>Pati</Text>
          <Text style={styles.tagline}>
            {isLogin ? 'Patilerin seni bekliyor.' : 'Aramıza katıl, bakımı kolaylaştır.'}
          </Text>
        </View>

        <View style={styles.switchRow}>
          <TouchableOpacity
            style={[styles.switchBtn, isLogin && styles.switchBtnActive]}
            onPress={() => setMode('login')}
          >
            <Text style={[styles.switchText, isLogin && styles.switchTextActive]}>Giriş Yap</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchBtn, !isLogin && styles.switchBtnActive]}
            onPress={() => setMode('register')}
          >
            <Text style={[styles.switchText, !isLogin && styles.switchTextActive]}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>

        {isLogin ? (
          <View>
            <Input
              label="E-posta"
              placeholder="ornek@mail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={loginForm.email}
              onChangeText={(v) => setLoginForm((p) => ({ ...p, email: v }))}
            />
            <Input
              label="Şifre"
              placeholder="••••••••"
              secureTextEntry
              value={loginForm.password}
              onChangeText={(v) => setLoginForm((p) => ({ ...p, password: v }))}
            />
            <Button
              title="Giriş Yap"
              loading={loading}
              style={{ marginTop: spacing.xl }}
              onPress={() => onLogin(loginForm)}
            />
          </View>
        ) : (
          <View>
            <Input
              label="Ad Soyad"
              placeholder="Ahmet Yılmaz"
              value={registerForm.full_name}
              onChangeText={(v) => setRegisterForm((p) => ({ ...p, full_name: v }))}
            />
            <Input
              label="E-posta"
              placeholder="ornek@mail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={registerForm.email}
              onChangeText={(v) => setRegisterForm((p) => ({ ...p, email: v }))}
            />
            <Input
              label="Şifre"
              placeholder="En az 6 karakter"
              secureTextEntry
              value={registerForm.password}
              onChangeText={(v) => setRegisterForm((p) => ({ ...p, password: v }))}
            />
            <Button
              title="Kayıt Ol"
              loading={loading}
              style={{ marginTop: spacing.xl }}
              onPress={async () => {
                const ok = await onRegister(registerForm);
                if (ok) {
                  setLoginForm((p) => ({ ...p, email: registerForm.email }));
                  setRegisterForm({ full_name: '', email: '', password: '' });
                  setMode('login');
                }
              }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: spacing.xxl },
  brand: { ...typography.display, color: colors.textPrimary, marginTop: spacing.lg },
  tagline: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  switchRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: 4,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  switchBtnActive: {
    backgroundColor: colors.primary,
  },
  switchText: { ...typography.bodyStrong, color: colors.textSecondary },
  switchTextActive: { color: colors.textOnPrimary },
});
