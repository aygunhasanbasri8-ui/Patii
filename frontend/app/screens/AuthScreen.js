import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../components/Button';
import Input from '../components/Input';
import PawMark from '../components/PawMark';
import TurnstileWidget from '../components/TurnstileWidget';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function AuthScreen({
  onLogin,
  onRegister,
  onVerifyEmail,
  onResendVerification,
  onForgotPassword,
  onResetPassword,
  loading,
}) {
  const [mode, setMode] = useState('login');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginTurnstileToken, setLoginTurnstileToken] = useState(null);

  const [registerForm, setRegisterForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [registerTurnstileToken, setRegisterTurnstileToken] = useState(null);

  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');

  const showTabs = mode === 'login' || mode === 'register';

  const handleRegisterSubmit = async () => {
    if (registerForm.password !== registerForm.confirmPassword) {
      alert('Şifreler eşleşmiyor.');
      return;
    }
    const ok = await onRegister({
      full_name: registerForm.full_name,
      email: registerForm.email,
      password: registerForm.password,
      turnstile_token: registerTurnstileToken,
    });
    if (ok) {
      setVerifyEmail(registerForm.email);
      setRegisterForm({ full_name: '', email: '', password: '', confirmPassword: '' });
      setRegisterTurnstileToken(null);
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

  const handleResend = () => {
    onResendVerification({ email: verifyEmail });
  };

  const handleForgotSubmit = async () => {
    const ok = await onForgotPassword({ email: forgotEmail });
    if (ok) {
      setResetEmail(forgotEmail);
      setResetCode('');
      setResetPassword('');
      setResetConfirm('');
      setMode('reset');
    }
  };

  const handleResetSubmit = async () => {
    if (resetPassword !== resetConfirm) {
      alert('Şifreler eşleşmiyor.');
      return;
    }
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

  const tagline =
    mode === 'register' ? 'Aramıza katıl, bakımı kolaylaştır.' :
    mode === 'verify'   ? 'E-postanı doğrula.' :
    mode === 'forgot'   ? 'Şifreni sıfırla.' :
    mode === 'reset'    ? 'Yeni şifreni belirle.' :
    'Patilerin seni bekliyor.';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <PawMark size={72} />
          <Text style={styles.brand}>Pati</Text>
          <Text style={styles.tagline}>{tagline}</Text>
        </View>

        {showTabs && (
          <View style={styles.switchRow}>
            <TouchableOpacity
              style={[styles.switchBtn, mode === 'login' && styles.switchBtnActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.switchText, mode === 'login' && styles.switchTextActive]}>Giriş Yap</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.switchBtn, mode === 'register' && styles.switchBtnActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.switchText, mode === 'register' && styles.switchTextActive]}>Kayıt Ol</Text>
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
            <TurnstileWidget onToken={setLoginTurnstileToken} />
            <Button
              title="Giriş Yap"
              loading={loading}
              style={{ marginTop: spacing.xl }}
              onPress={() => onLogin({ ...loginForm, turnstile_token: loginTurnstileToken })}
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
            <TurnstileWidget onToken={setRegisterTurnstileToken} />
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
            <TouchableOpacity style={styles.linkRow} onPress={handleResend}>
              <Text style={styles.link}>Kodu tekrar gönder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkRow} onPress={() => setMode('login')}>
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
            <TouchableOpacity style={styles.linkRow} onPress={() => setMode('forgot')}>
              <Text style={styles.link}>Yeni kod iste</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkRow} onPress={() => setMode('login')}>
              <Text style={styles.link}>Giriş ekranına dön</Text>
            </TouchableOpacity>
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
    marginBottom: spacing.lg,
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
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  bold: { fontWeight: '700', color: colors.textPrimary },
  linkRow: { alignItems: 'center', marginTop: spacing.md },
  link: { ...typography.caption, color: colors.primary },
});
