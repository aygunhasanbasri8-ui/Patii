import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import Button from '../components/Button';
import Input from '../components/Input';
import PawMark from '../components/PawMark';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function AuthScreen({
  onLogin,
  onRegister,
  onVerifyEmail,
  onResendVerification,
  onForgotPassword,
  onResetPassword,
  loading,
  error,
  onClearError,
}) {
  const [mode, setMode] = useState('login');
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    setLocalError(null);
    onClearError?.();
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayError = localError || error;

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    full_name: '', email: '', password: '', confirmPassword: '',
  });
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyFallbackCode, setVerifyFallbackCode] = useState(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetFallbackCode, setResetFallbackCode] = useState(null);

  const showTabs = mode === 'login' || mode === 'register';

  const tagline =
    mode === 'register' ? 'Aramıza katıl, bakımı kolaylaştır.' :
    mode === 'verify'   ? 'E-postanı doğrula.' :
    mode === 'forgot'   ? 'Şifreni sıfırla.' :
    mode === 'reset'    ? 'Yeni şifreni belirle.' :
    'Patilerin seni bekliyor.';

  const handleRegisterSubmit = async () => {
    if (registerForm.password !== registerForm.confirmPassword) {
      setLocalError('Şifreler eşleşmiyor.');
      return;
    }
    setLocalError(null);
    const result = await onRegister({
      full_name: registerForm.full_name,
      email: registerForm.email,
      password: registerForm.password,
    });
    if (result) {
      setVerifyEmail(registerForm.email);
      setVerifyFallbackCode(result.verification_code_fallback ?? null);
      setRegisterForm({ full_name: '', email: '', password: '', confirmPassword: '' });
      setVerifyCode('');
      setMode('verify');
    }
  };

  const handleVerifySubmit = async () => {
    const ok = await onVerifyEmail({ email: verifyEmail, code: verifyCode });
    if (ok) {
      setLoginForm((p) => ({ ...p, email: verifyEmail }));
      setVerifyCode('');
      setMode('login');
    }
  };

  const handleForgotSubmit = async () => {
    const result = await onForgotPassword({ email: forgotEmail });
    if (result) {
      setResetEmail(forgotEmail);
      setResetFallbackCode(result.reset_code_fallback ?? null);
      setResetCode('');
      setResetPassword('');
      setResetConfirm('');
      setMode('reset');
    }
  };

  const handleResetSubmit = async () => {
    if (resetPassword !== resetConfirm) {
      setLocalError('Şifreler eşleşmiyor.');
      return;
    }
    setLocalError(null);
    const ok = await onResetPassword({
      email: resetEmail,
      code: resetCode,
      new_password: resetPassword,
    });
    if (ok) {
      setLoginForm((p) => ({ ...p, email: resetEmail }));
      setMode('login');
    }
  };

  // Ortak form içeriği — hem mobile hem web'de aynı JSX kullanılır
  function renderFormContent() {
    return (
      <>
        {displayError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}
        {showTabs && (
          <View style={styles.switchRow}>
            <TouchableOpacity
              style={[styles.switchBtn, mode === 'login' && styles.switchBtnActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.switchText, mode === 'login' && styles.switchTextActive]}>
                Giriş Yap
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.switchBtn, mode === 'register' && styles.switchBtnActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.switchText, mode === 'register' && styles.switchTextActive]}>
                Kayıt Ol
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'login' && (
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
              onPress={() => onLogin({ ...loginForm })}
            />
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => { setForgotEmail(loginForm.email); setMode('forgot'); }}
            >
              <Text style={styles.link}>Şifremi unuttum</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'register' && (
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
            <Input
              label="Şifre Tekrar"
              placeholder="Şifreni tekrar gir"
              secureTextEntry
              value={registerForm.confirmPassword}
              onChangeText={(v) => setRegisterForm((p) => ({ ...p, confirmPassword: v }))}
            />
            <Button
              title="Kayıt Ol"
              loading={loading}
              style={{ marginTop: spacing.xl }}
              onPress={handleRegisterSubmit}
            />
          </View>
        )}

        {mode === 'verify' && (
          <View>
            <Text style={styles.infoText}>
              <Text style={styles.bold}>{verifyEmail}</Text> adresine 6 haneli bir doğrulama kodu gönderdik.
            </Text>
            {verifyFallbackCode && (
              <View style={styles.fallbackBox}>
                <Text style={styles.fallbackText}>Mail gönderilemedi — demo kodu: {verifyFallbackCode}</Text>
              </View>
            )}
            <Input
              label="Doğrulama Kodu"
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              value={verifyCode}
              onChangeText={setVerifyCode}
            />
            <Button
              title="Doğrula"
              loading={loading}
              style={{ marginTop: spacing.xl }}
              onPress={handleVerifySubmit}
            />
            <TouchableOpacity
              style={styles.linkRow}
              onPress={async () => {
                const result = await onResendVerification({ email: verifyEmail });
                if (result) setVerifyFallbackCode(result.verification_code_fallback ?? null);
              }}
            >
              <Text style={styles.link}>Kodu tekrar gönder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkRow} onPress={() => { setVerifyFallbackCode(null); setMode('login'); }}>
              <Text style={styles.link}>Giriş ekranına dön</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'forgot' && (
          <View>
            <Text style={styles.infoText}>
              Kayıtlı e-posta adresini gir, şifre sıfırlama kodunu gönderelim.
            </Text>
            <Input
              label="E-posta"
              placeholder="ornek@mail.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={forgotEmail}
              onChangeText={setForgotEmail}
            />
            <Button
              title="Kod Gönder"
              loading={loading}
              style={{ marginTop: spacing.xl }}
              onPress={handleForgotSubmit}
            />
            <TouchableOpacity style={styles.linkRow} onPress={() => setMode('login')}>
              <Text style={styles.link}>Giriş ekranına dön</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'reset' && (
          <View>
            <Text style={styles.infoText}>
              <Text style={styles.bold}>{resetEmail}</Text> adresine gönderilen kodu ve yeni şifreni gir.
            </Text>
            {resetFallbackCode && (
              <View style={styles.fallbackBox}>
                <Text style={styles.fallbackText}>Mail gönderilemedi — demo kodu: {resetFallbackCode}</Text>
              </View>
            )}
            <Input
              label="Sıfırlama Kodu"
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
              value={resetCode}
              onChangeText={setResetCode}
            />
            <Input
              label="Yeni Şifre"
              placeholder="En az 6 karakter"
              secureTextEntry
              value={resetPassword}
              onChangeText={setResetPassword}
            />
            <Input
              label="Yeni Şifre Tekrar"
              placeholder="Şifreni tekrar gir"
              secureTextEntry
              value={resetConfirm}
              onChangeText={setResetConfirm}
            />
            <Button
              title="Şifremi Sıfırla"
              loading={loading}
              style={{ marginTop: spacing.xl }}
              onPress={handleResetSubmit}
            />
            <TouchableOpacity style={styles.linkRow} onPress={() => { setResetFallbackCode(null); setMode('forgot'); }}>
              <Text style={styles.link}>Yeni kod iste</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkRow} onPress={() => { setResetFallbackCode(null); setMode('login'); }}>
              <Text style={styles.link}>Giriş ekranına dön</Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  }

  // ── WEB: split-screen layout ──────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <View style={webStyles.container}>
        {/* Sol panel: marka */}
        <View style={webStyles.brandPanel}>
          <PawMark size={72} />
          <Text style={webStyles.brandName}>Pati</Text>
          <Text style={webStyles.brandTagline}>
            Patilerin en iyi dostu.
          </Text>
          <View style={webStyles.featureCard}>
            <Text style={webStyles.featureItem}>🐾 Sağlık ve aşı hatırlatıcıları</Text>
            <Text style={webStyles.featureItem}>🎙 AI destekli ses analizi</Text>
            <Text style={webStyles.featureItem}>💬 Bakım asistanı ile sohbet</Text>
          </View>
        </View>

        {/* Sağ panel: form */}
        <ScrollView
          contentContainerStyle={webStyles.formScroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={webStyles.formContent}>
            <Text style={webStyles.formTagline}>{tagline}</Text>
            {renderFormContent()}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── MOBİL: mevcut layout (değişmedi) ─────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <PawMark size={72} />
          <Text style={styles.brand}>Pati</Text>
          <Text style={styles.tagline}>{tagline}</Text>
        </View>
        {renderFormContent()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Mobil stiller (değişmedi) ─────────────────────────────────────────────
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
    marginBottom: spacing.lg,
  },
  switchBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: radius.pill },
  switchBtnActive: { backgroundColor: colors.primary },
  switchText: { ...typography.bodyStrong, color: colors.textSecondary },
  switchTextActive: { color: colors.textOnPrimary },
  infoText: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 20 },
  bold: { fontWeight: '700', color: colors.textPrimary },
  linkRow: { alignItems: 'center', marginTop: spacing.md },
  link: { ...typography.caption, color: colors.primary },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { ...typography.caption, color: colors.dangerDark, fontWeight: '700' },
  fallbackBox: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  fallbackText: { ...typography.caption, color: colors.primaryDark, fontWeight: '700' },
});

// ── Web stiller (sadece web'de kullanılır) ────────────────────────────────
const webStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  brandPanel: {
    width: '42%',
    backgroundColor: colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
    gap: spacing.xl,
  },
  brandName: {
    ...typography.display,
    color: colors.textOnPrimary,
    fontSize: 40,
    marginTop: spacing.md,
  },
  brandTagline: {
    ...typography.subtitle,
    color: colors.primaryLight,
    textAlign: 'center',
  },
  featureCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginTop: spacing.lg,
    gap: spacing.md,
    alignSelf: 'stretch',
  },
  featureItem: {
    ...typography.body,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
  },
  formScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  formContent: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  formTagline: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
});
