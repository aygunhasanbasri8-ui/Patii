import { Ionicons } from '@expo/vector-icons';
import { GoogleGenerativeAI } from '@google/generative-ai';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const BACKEND_BASE_URL = 'http://10.0.2.2:8000';
const AUTH_TOKEN_KEY = '@auth_token';
const AUTH_USER_NAME_KEY = '@auth_user_name';
const AUTH_USER_ID_KEY = '@auth_user_id';
const AI_API_KEY = '@ai_api_key';
const Tab = createBottomTabNavigator();

async function requestApi(path, options = {}, authToken = '') {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!response.ok) {
    let msg = 'İstek başarısız.';
    try {
      const data = await response.json();
      if (data?.detail) msg = data.detail;
    } catch (_e) {
      msg = `HTTP ${response.status}`;
    }
    throw new Error(msg);
  }
  if (response.status === 204) return null;
  return response.json();
}

function AuthGate({
  mode,
  setMode,
  loginForm,
  setLoginForm,
  registerForm,
  setRegisterForm,
  onLogin,
  onRegister,
  loading,
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Pati&apos;ye Hoş Geldin</Text>
      <Text style={styles.subtitle}>Devam etmek için giriş yap.</Text>
      <View style={styles.switchRow}>
        <TouchableOpacity style={[styles.switchBtn, mode === 'login' && styles.switchBtnActive]} onPress={() => setMode('login')}>
          <Text style={[styles.switchText, mode === 'login' && styles.switchTextActive]}>Giriş</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.switchBtn, mode === 'register' && styles.switchBtnActive]} onPress={() => setMode('register')}>
          <Text style={[styles.switchText, mode === 'register' && styles.switchTextActive]}>Kayıt</Text>
        </TouchableOpacity>
      </View>
      {mode === 'login' ? (
        <>
          <TextInput style={styles.input} placeholder="E-posta" autoCapitalize="none" value={loginForm.email} onChangeText={(v) => setLoginForm((p) => ({ ...p, email: v }))} />
          <TextInput style={styles.input} placeholder="Şifre" secureTextEntry value={loginForm.password} onChangeText={(v) => setLoginForm((p) => ({ ...p, password: v }))} />
          <TouchableOpacity style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Giriş Yap</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput style={styles.input} placeholder="Ad Soyad" value={registerForm.full_name} onChangeText={(v) => setRegisterForm((p) => ({ ...p, full_name: v }))} />
          <TextInput style={styles.input} placeholder="E-posta" autoCapitalize="none" value={registerForm.email} onChangeText={(v) => setRegisterForm((p) => ({ ...p, email: v }))} />
          <TextInput style={styles.input} placeholder="Şifre" secureTextEntry value={registerForm.password} onChangeText={(v) => setRegisterForm((p) => ({ ...p, password: v }))} />
          <TouchableOpacity style={styles.button} onPress={onRegister}>
            <Text style={styles.buttonText}>Kayıt Ol</Text>
          </TouchableOpacity>
        </>
      )}
      {loading ? <ActivityIndicator style={{ marginTop: 12 }} color="#FF9F43" /> : null}
    </ScrollView>
  );
}

function HomeScreen({ pet }) {
  return (
    <View style={styles.center}>
      <Ionicons name="paw" size={84} color="#FF9F43" />
      <Text style={styles.title}>{pet ? `${pet.name}'in Dünyası` : 'Pati'}</Text>
      <Text style={styles.subtitle}>{pet ? `${pet.breed} - ${pet.species}` : 'Profil sekmesinden pati ekle.'}</Text>
    </View>
  );
}

function ProfileScreen({ pets, selected, setSelected, draftPet, setDraftPet, onAddDraftPet, onSavePet, onDeletePet, loading }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Patilerim</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {pets.map((pet, i) => (
          <TouchableOpacity key={`${pet.id || 'new'}-${i}`} style={[styles.petChip, i === selected && styles.petChipActive]} onPress={() => setSelected(i)}>
            <Text style={styles.petChipText}>{pet.name || `Pati ${i + 1}`}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.secondaryButton} onPress={onAddDraftPet}>
        <Text style={styles.secondaryText}>Yeni Pati Ekle</Text>
      </TouchableOpacity>
      <TextInput style={styles.input} placeholder="Ad" value={draftPet.name} onChangeText={(v) => setDraftPet((p) => ({ ...p, name: v }))} />
      <TextInput style={styles.input} placeholder="Tür (Örn: Kedi)" value={draftPet.species} onChangeText={(v) => setDraftPet((p) => ({ ...p, species: v }))} />
      <TextInput style={styles.input} placeholder="Cins" value={draftPet.breed} onChangeText={(v) => setDraftPet((p) => ({ ...p, breed: v }))} />
      <TouchableOpacity style={styles.button} onPress={onSavePet}>
        <Text style={styles.buttonText}>Kaydet</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, { backgroundColor: '#f55' }]} onPress={onDeletePet}>
        <Text style={styles.buttonText}>Sil</Text>
      </TouchableOpacity>
      {loading ? <ActivityIndicator style={{ marginTop: 12 }} color="#FF9F43" /> : null}
    </ScrollView>
  );
}

function ReminderScreen({ reminders, history, form, setForm, onAdd, onDelete, onRefresh, onRefreshHistory, loading }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Hatırlatıcı Ekle</Text>
      <TextInput style={styles.input} placeholder="Başlık" value={form.title} onChangeText={(v) => setForm((p) => ({ ...p, title: v }))} />
      <TextInput style={styles.input} placeholder="Açıklama" value={form.description} onChangeText={(v) => setForm((p) => ({ ...p, description: v }))} />
      <TextInput style={styles.input} placeholder="Tarih (gg/aa/yyyy)" value={form.remind_at} onChangeText={(v) => setForm((p) => ({ ...p, remind_at: v }))} />
      <TouchableOpacity style={styles.button} onPress={onAdd}>
        <Text style={styles.buttonText}>Ekle</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={onRefresh}>
        <Text style={styles.secondaryText}>Aktif Hatırlatıcıları Yenile</Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>Aktif Hatırlatıcılar</Text>
      {reminders.length === 0 ? <Text style={styles.subtitle}>Kayıt yok.</Text> : reminders.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.cardTitle}>{r.text}</Text>
          <Text style={styles.small}>Tarih: {r.date}</Text>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(r.id)}>
            <Text style={styles.buttonText}>Sil</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.secondaryButton} onPress={onRefreshHistory}>
        <Text style={styles.secondaryText}>Hatırlatıcı Geçmişini Getir</Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>Hatırlatıcı Geçmişi</Text>
      {history.length === 0 ? <Text style={styles.subtitle}>Geçmiş kayıt yok.</Text> : history.map((r) => (
        <View key={`h-${r.id}`} style={styles.historyCard}>
          <Text style={styles.cardTitle}>{r.text}</Text>
          <Text style={styles.small}>Geçmiş tarihi: {r.date}</Text>
        </View>
      ))}
      {loading ? <ActivityIndicator style={{ marginTop: 12 }} color="#FF9F43" /> : null}
    </ScrollView>
  );
}

function AnalyzeScreen({ result, onAnalyze, loading }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Ses Analizi</Text>
      <TouchableOpacity style={styles.button} onPress={onAnalyze}>
        <Text style={styles.buttonText}>Analiz Et</Text>
      </TouchableOpacity>
      {loading ? <ActivityIndicator style={{ marginTop: 12 }} color="#FF9F43" /> : null}
      {result ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{result.status}</Text>
          <Text style={styles.small}>Sonuç: {result.result}</Text>
          <Text style={styles.small}>Güven: {result.confidence}</Text>
        </View>
      ) : (
        <Text style={styles.subtitle}>Henüz analiz yok.</Text>
      )}
    </ScrollView>
  );
}

function ChatScreen({ apiKey, setApiKey, messages, prompt, setPrompt, onSaveKey, onSend, loading }) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>AI Chat</Text>
      <TextInput style={styles.input} placeholder="Gemini API Key" value={apiKey} onChangeText={setApiKey} autoCapitalize="none" />
      <TouchableOpacity style={styles.secondaryButton} onPress={onSaveKey}>
        <Text style={styles.secondaryText}>API Key Kaydet</Text>
      </TouchableOpacity>
      <View style={{ marginTop: 12 }}>
        {messages.map((m, i) => (
          <View key={`${m.role}-${i}`} style={[styles.card, m.role === 'user' ? styles.userBubble : styles.botBubble]}>
            <Text style={styles.cardTitle}>{m.role === 'user' ? 'Sen' : 'AI'}</Text>
            <Text style={styles.small}>{m.text}</Text>
          </View>
        ))}
      </View>
      <TextInput style={styles.input} placeholder="Mesajın..." value={prompt} onChangeText={setPrompt} />
      <TouchableOpacity style={styles.button} onPress={onSend}>
        <Text style={styles.buttonText}>Gönder</Text>
      </TouchableOpacity>
      {loading ? <ActivityIndicator style={{ marginTop: 12 }} color="#FF9F43" /> : null}
    </ScrollView>
  );
}

export default function Page() {
  const [bootLoading, setBootLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ full_name: '', email: '', password: '' });
  const [authToken, setAuthToken] = useState('');
  const [, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [pets, setPets] = useState([]);
  const [selected, setSelected] = useState(0);
  const [draftPet, setDraftPet] = useState({ name: '', species: '', breed: '' });
  const [reminders, setReminders] = useState([]);
  const [history, setHistory] = useState([]);
  const [reminderForm, setReminderForm] = useState({ title: '', description: '', remind_at: '' });
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');

  const selectedPet = useMemo(() => pets[selected] || null, [pets, selected]);

  const fetchPets = async (token = authToken, uid = userId) => {
    const data = await requestApi(`/api/pets/my-pets/${uid}`, {}, token);
    setPets(Array.isArray(data) ? data : []);
    setSelected(0);
  };

  const fetchReminders = useCallback(async () => {
    if (!selectedPet?.id) return;
    const data = await requestApi(`/api/reminders/pet/${selectedPet.id}`, {}, authToken);
    setReminders(Array.isArray(data) ? data : []);
  }, [selectedPet?.id, authToken]);

  useEffect(() => {
    const init = async () => {
      try {
        const t = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        const n = await AsyncStorage.getItem(AUTH_USER_NAME_KEY);
        const id = await AsyncStorage.getItem(AUTH_USER_ID_KEY);
        const key = await AsyncStorage.getItem(AI_API_KEY);
        if (t && id) {
          setAuthToken(t);
          setUserName(n || '');
          setUserId(id);
          await fetchPets(t, id);
        }
        if (key) setApiKey(key);
      } catch (_e) {
        Alert.alert('Hata', 'Başlangıç verileri yüklenemedi.');
      } finally {
        setBootLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPet?.id && authToken) {
      fetchReminders();
    } else {
      setReminders([]);
      setHistory([]);
    }
  }, [selectedPet?.id, authToken, fetchReminders]);

  const onRegister = async () => {
    if (!registerForm.full_name || !registerForm.email || !registerForm.password) return Alert.alert('Eksik alan', 'Tüm alanları doldurun.');
    try {
      setLoading(true);
      await requestApi('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(registerForm),
      });
      setAuthMode('login');
      setLoginForm((p) => ({ ...p, email: registerForm.email }));
      setRegisterForm({ full_name: '', email: '', password: '' });
      Alert.alert('Başarılı', 'Kayıt tamamlandı.');
    } catch (e) {
      Alert.alert('Kayıt hatası', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onLogin = async () => {
    if (!loginForm.email || !loginForm.password) return Alert.alert('Eksik alan', 'E-posta ve şifre girin.');
    try {
      setLoading(true);
      const data = await requestApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      });
      const token = data.access_token || '';
      const uid = String(data.user_id || '');
      setAuthToken(token);
      setUserName(data.user_name || '');
      setUserId(uid);
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      await AsyncStorage.setItem(AUTH_USER_NAME_KEY, data.user_name || '');
      await AsyncStorage.setItem(AUTH_USER_ID_KEY, uid);
      await fetchPets(token, uid);
    } catch (e) {
      Alert.alert('Giriş hatası', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_USER_NAME_KEY);
    await AsyncStorage.removeItem(AUTH_USER_ID_KEY);
    setAuthToken('');
    setUserName('');
    setUserId('');
    setPets([]);
    setMessages([]);
  };

  const onAddDraftPet = () => {
    const next = [...pets, { name: '', species: '', breed: '' }];
    setPets(next);
    setSelected(next.length - 1);
    setDraftPet({ name: '', species: '', breed: '' });
  };

  useEffect(() => {
    setDraftPet({
      name: selectedPet?.name || '',
      species: selectedPet?.species || '',
      breed: selectedPet?.breed || '',
    });
  }, [selected, selectedPet?.name, selectedPet?.species, selectedPet?.breed]);

  const onSavePet = async () => {
    if (!draftPet.name.trim() || !draftPet.species.trim() || !draftPet.breed.trim()) return Alert.alert('Eksik alan', 'Ad, tür ve cins gerekli.');
    try {
      setLoading(true);
      if (selectedPet?.id) {
        await requestApi(`/api/pets/${selectedPet.id}`, {
          method: 'PUT',
          body: JSON.stringify(draftPet),
        }, authToken);
      } else {
        await requestApi('/api/pets/add', {
          method: 'POST',
          body: JSON.stringify({ ...draftPet, owner_id: Number(userId) }),
        }, authToken);
      }
      await fetchPets();
      Alert.alert('Başarılı', 'Pati kaydedildi.');
    } catch (e) {
      Alert.alert('Hata', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onDeletePet = async () => {
    if (!selectedPet) return;
    if (!selectedPet.id) {
      const copy = pets.slice();
      copy.splice(selected, 1);
      setPets(copy);
      setSelected(0);
      return;
    }
    try {
      setLoading(true);
      await requestApi(`/api/pets/${selectedPet.id}`, { method: 'DELETE' }, authToken);
      await fetchPets();
    } catch (e) {
      Alert.alert('Silme hatası', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onAddReminder = async () => {
    if (!selectedPet?.id) return Alert.alert('Uyarı', 'Önce bir pati seç.');
    if (!reminderForm.title || !reminderForm.description || !reminderForm.remind_at) return Alert.alert('Eksik alan', 'Tüm alanları doldurun.');
    try {
      setLoading(true);
      await requestApi('/api/reminders/add', {
        method: 'POST',
        body: JSON.stringify({ ...reminderForm, pet_id: selectedPet.id }),
      }, authToken);
      setReminderForm({ title: '', description: '', remind_at: '' });
      await fetchReminders();
    } catch (e) {
      Alert.alert('Hata', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onDeleteReminder = async (id) => {
    try {
      setLoading(true);
      await requestApi(`/api/reminders/${id}`, { method: 'DELETE' }, authToken);
      await fetchReminders();
    } catch (e) {
      Alert.alert('Hata', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefreshHistory = async () => {
    if (!selectedPet?.id) return;
    try {
      setLoading(true);
      const data = await requestApi(`/api/reminders/history/pet/${selectedPet.id}`, {}, authToken);
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Hata', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onAnalyze = async () => {
    if (!selectedPet?.id) return Alert.alert('Uyarı', 'Önce bir pati seç.');
    try {
      setLoading(true);
      const data = await requestApi(`/api/analyze/meow?pet_id=${selectedPet.id}`, { method: 'POST' }, authToken);
      setAnalyzeResult(data);
    } catch (e) {
      Alert.alert('Hata', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onSaveApiKey = async () => {
    await AsyncStorage.setItem(AI_API_KEY, apiKey.trim());
    Alert.alert('Başarılı', 'API key kaydedildi.');
  };

  const onSendChat = async () => {
    if (!apiKey.trim()) return Alert.alert('API key gerekli', 'Önce API key girin.');
    if (!prompt.trim()) return;
    const userMsg = { role: 'user', text: prompt.trim() };
    setMessages((m) => [...m, userMsg]);
    setPrompt('');
    try {
      setLoading(true);
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(userMsg.text);
      const text = result.response.text();
      setMessages((m) => [...m, { role: 'assistant', text }]);
    } catch (e) {
      Alert.alert('Chat hatası', e.message || 'AI yanıtı alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  if (bootLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF9F43" /></View>;

  if (!authToken) {
    return (
      <AuthGate
        mode={authMode}
        setMode={setAuthMode}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        registerForm={registerForm}
        setRegisterForm={setRegisterForm}
        onLogin={onLogin}
        onRegister={onRegister}
        loading={loading}
      />
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icon = route.name === 'Ana Sayfa' ? 'home' : route.name === 'Profil' ? 'person' : route.name === 'Hatırlatıcı' ? 'notifications' : route.name === 'Analiz' ? 'mic' : 'chatbubble';
          return <Ionicons name={icon} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF9F43',
        headerStyle: { backgroundColor: '#FF9F43' },
        headerTintColor: '#fff',
        headerRight: () => (
          <TouchableOpacity onPress={onLogout} style={{ marginRight: 12 }}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Ana Sayfa">{() => <HomeScreen pet={selectedPet} />}</Tab.Screen>
      <Tab.Screen name="Profil">
        {() => (
          <ProfileScreen
            pets={pets}
            selected={selected}
            setSelected={setSelected}
            draftPet={draftPet}
            setDraftPet={setDraftPet}
            onAddDraftPet={onAddDraftPet}
            onSavePet={onSavePet}
            onDeletePet={onDeletePet}
            loading={loading}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Hatırlatıcı">
        {() => (
          <ReminderScreen
            reminders={reminders}
            history={history}
            form={reminderForm}
            setForm={setReminderForm}
            onAdd={onAddReminder}
            onDelete={onDeleteReminder}
            onRefresh={fetchReminders}
            onRefreshHistory={onRefreshHistory}
            loading={loading}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Analiz">{() => <AnalyzeScreen result={analyzeResult} onAnalyze={onAnalyze} loading={loading} />}</Tab.Screen>
      <Tab.Screen name="Chat">
        {() => (
          <ChatScreen
            apiKey={apiKey}
            setApiKey={setApiKey}
            messages={messages}
            prompt={prompt}
            setPrompt={setPrompt}
            onSaveKey={onSaveApiKey}
            onSend={onSendChat}
            loading={loading}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 },
  container: { padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', color: '#FF9F43', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginTop: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FF9F43', marginTop: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#FF9F43', borderRadius: 8, padding: 10, marginTop: 8 },
  button: { backgroundColor: '#FF9F43', padding: 13, borderRadius: 10, marginTop: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { backgroundColor: '#fff1e5', padding: 12, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  secondaryText: { color: '#8a4b00', fontWeight: '700' },
  switchRow: { marginTop: 16, flexDirection: 'row', borderWidth: 1, borderColor: '#ffd7b3', borderRadius: 10, overflow: 'hidden' },
  switchBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff9f2' },
  switchBtnActive: { backgroundColor: '#FF9F43' },
  switchText: { color: '#8a4b00', fontWeight: '700' },
  switchTextActive: { color: '#fff' },
  petChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#f7f7f7', marginRight: 8 },
  petChipActive: { backgroundColor: '#ffe3c7' },
  petChipText: { color: '#333', fontWeight: '600' },
  card: { backgroundColor: '#f8f8f8', borderRadius: 10, padding: 10, marginTop: 10 },
  historyCard: { backgroundColor: '#eef8ff', borderRadius: 10, padding: 10, marginTop: 10 },
  cardTitle: { fontWeight: '700', color: '#333' },
  small: { color: '#666', marginTop: 3 },
  deleteBtn: { marginTop: 8, backgroundColor: '#f55', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  userBubble: { backgroundColor: '#fff0df' },
  botBubble: { backgroundColor: '#e9f6ff' },
});