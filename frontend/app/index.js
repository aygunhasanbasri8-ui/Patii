import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, TouchableOpacity, View } from 'react-native';

import * as api from './lib/api';
import { ApiError } from './lib/api';
import { useAuth } from './hooks/useAuth';
import { colors } from './theme/tokens';

import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import ReminderScreen, { isValidReminderDate } from './screens/ReminderScreen';
import AnalyzeScreen from './screens/AnalyzeScreen';
import ChatScreen from './screens/ChatScreen';

const Tab = createBottomTabNavigator();
const EMPTY_DRAFT_PET = { name: '', species: '', breed: '' };

function showError(prefix, error) {
  const message = error instanceof ApiError ? error.message : error?.message || 'Bilinmeyen bir hata oluştu.';
  Alert.alert(prefix, message);
}

export default function Page() {
  const auth = useAuth();
  const { authToken, userName, userId } = auth;

  const [bootLoading, setBootLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [pets, setPets] = useState([]);
  const [selected, setSelected] = useState(0);
  const [draftPet, setDraftPet] = useState(EMPTY_DRAFT_PET);

  const [reminders, setReminders] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [reminderForm, setReminderForm] = useState({ title: '', description: '', remind_at: '' });
  const [editingReminderId, setEditingReminderId] = useState(null);

  const [analyzeResult, setAnalyzeResult] = useState(null);

  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');

  const selectedPet = useMemo(() => pets[selected] || null, [pets, selected]);
  const isNewPet = !selectedPet?.id;

  // --- Veri çekme yardımcıları ----------------------------------------------
  const fetchPets = useCallback(async (token = authToken, uid = userId) => {
    if (!token || !uid) return;
    const data = await api.getMyPets(uid, token);
    setPets(Array.isArray(data) ? data : []);
    setSelected(0);
  }, [authToken, userId]);

  const fetchReminders = useCallback(async () => {
    if (!selectedPet?.id || !authToken) return;
    const data = await api.getPetReminders(selectedPet.id, authToken);
    setReminders(Array.isArray(data) ? data : []);
  }, [selectedPet?.id, authToken]);

  // --- Açılış: oturum geri yükle ----------------------------------------------
  useEffect(() => {
    const init = async () => {
      try {
        const restored = await auth.restore();
        if (restored) {
          await fetchPets(restored.token, restored.userId);
        }
      } catch (e) {
        showError('Başlangıç hatası', new Error('Başlangıç verileri yüklenemedi.'));
      } finally {
        setBootLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seçili pati değiştiğinde hatırlatıcıları tazele
  useEffect(() => {
    setHistory([]);
    setHistoryLoaded(false);
    setEditingReminderId(null);
    setReminderForm({ title: '', description: '', remind_at: '' });
    if (selectedPet?.id && authToken) {
      fetchReminders().catch((e) => showError('Hata', e));
    } else {
      setReminders([]);
    }
  }, [selectedPet?.id, authToken, fetchReminders]);

  // Seçim değişince taslak formu güncelle
  useEffect(() => {
    setDraftPet({
      name: selectedPet?.name || '',
      species: selectedPet?.species || '',
      breed: selectedPet?.breed || '',
    });
  }, [selected, selectedPet?.name, selectedPet?.species, selectedPet?.breed]);

  // --- Auth handlers -----------------------------------------------------------
  const onLogin = async ({ email, password }) => {
    if (!email.trim() || !password) {
      Alert.alert('Eksik alan', 'E-posta ve şifre girmelisin.');
      return;
    }
    try {
      setAuthLoading(true);
      const { token, userId: uid } = await auth.login(email.trim(), password);
      await fetchPets(token, uid);
    } catch (e) {
      showError('Giriş hatası', e);
    } finally {
      setAuthLoading(false);
    }
  };

  const onRegister = async ({ full_name, email, password }) => {
    if (!full_name.trim() || !email.trim() || !password) {
      Alert.alert('Eksik alan', 'Tüm alanları doldurmalısın.');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Zayıf şifre', 'Şifre en az 6 karakter olmalı.');
      return false;
    }
    try {
      setAuthLoading(true);
      await auth.register(full_name.trim(), email.trim(), password);
      Alert.alert('Başarılı', 'Kayıt tamamlandı, şimdi giriş yapabilirsin.');
      return true;
    } catch (e) {
      showError('Kayıt hatası', e);
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const onLogout = async () => {
    await auth.logout();
    setPets([]);
    setSelected(0);
    setReminders([]);
    setHistory([]);
    setHistoryLoaded(false);
    setAnalyzeResult(null);
    setMessages([]);
  };

  const onRefreshDashboard = async () => {
    try {
      setRefreshing(true);
      await fetchPets();
      if (selectedPet?.id) await fetchReminders();
    } catch (e) {
      showError('Yenileme hatası', e);
    } finally {
      setRefreshing(false);
    }
  };

  // --- Pet handlers ---------------------------------------------------------------
  const onAddDraftPet = () => {
    const next = [...pets, { ...EMPTY_DRAFT_PET }];
    setPets(next);
    setSelected(next.length - 1);
    setDraftPet({ ...EMPTY_DRAFT_PET });
  };

  const onSavePet = async () => {
    const name = draftPet.name.trim();
    const species = draftPet.species.trim();
    const breed = draftPet.breed.trim();
    if (!name || !species || !breed) {
      Alert.alert('Eksik alan', 'Ad, tür ve cins zorunludur.');
      return;
    }
    try {
      setLoading(true);
      if (selectedPet?.id) {
        await api.updatePet(selectedPet.id, { name, species, breed }, authToken);
      } else {
        await api.addPet({ name, species, breed }, authToken);
      }
      await fetchPets();
      Alert.alert('Başarılı', `${name} kaydedildi.`);
    } catch (e) {
      showError('Kaydetme hatası', e);
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
    Alert.alert('Patiyi sil', `${selectedPet.name} silinsin mi? Bu işlem geri alınamaz.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await api.deletePet(selectedPet.id, authToken);
            await fetchPets();
          } catch (e) {
            showError('Silme hatası', e);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // --- Reminder handlers -----------------------------------------------------------
  const onAddReminder = async () => {
    if (!selectedPet?.id) {
      Alert.alert('Uyarı', 'Önce bir pati seç.');
      return;
    }
    const { title, description, remind_at } = reminderForm;
    if (!title.trim() || !description.trim() || !remind_at.trim()) {
      Alert.alert('Eksik alan', 'Tüm alanları doldurmalısın.');
      return;
    }
    if (!isValidReminderDate(remind_at.trim())) {
      Alert.alert('Geçersiz tarih', 'Tarihi gg/aa/yyyy formatında gir. Örn: 15/04/2026');
      return;
    }
    try {
      setLoading(true);
      await api.addReminder(
        { pet_id: selectedPet.id, title: title.trim(), description: description.trim(), remind_at: remind_at.trim() },
        authToken
      );
      setReminderForm({ title: '', description: '', remind_at: '' });
      await fetchReminders();
    } catch (e) {
      showError('Hatırlatıcı hatası', e);
    } finally {
      setLoading(false);
    }
  };

  // Reminder.text backend'de "title: description" formatında birleştirilmiş
  // saklanıyor (bkz. services.py add_reminder). Düzenleme formunu doldurmak
  // için bunu geri ayırıyoruz.
  const onEditReminder = (reminder) => {
    const [title, ...rest] = reminder.text.split(': ');
    setReminderForm({
      title: title || '',
      description: rest.join(': ') || '',
      remind_at: reminder.date || '',
    });
    setEditingReminderId(reminder.id);
  };

  const onCancelEditReminder = () => {
    setEditingReminderId(null);
    setReminderForm({ title: '', description: '', remind_at: '' });
  };

  const onUpdateReminder = async () => {
    if (!editingReminderId) return;
    const { title, description, remind_at } = reminderForm;
    if (!title.trim() || !description.trim() || !remind_at.trim()) {
      Alert.alert('Eksik alan', 'Tüm alanları doldurmalısın.');
      return;
    }
    if (!isValidReminderDate(remind_at.trim())) {
      Alert.alert('Geçersiz tarih', 'Tarihi gg/aa/yyyy formatında gir. Örn: 15/04/2026');
      return;
    }
    try {
      setLoading(true);
      await api.updateReminder(
        editingReminderId,
        { title: title.trim(), description: description.trim(), remind_at: remind_at.trim() },
        authToken
      );
      onCancelEditReminder();
      await fetchReminders();
    } catch (e) {
      showError('Güncelleme hatası', e);
    } finally {
      setLoading(false);
    }
  };

  const onDeleteReminder = async (id) => {
    try {
      setLoading(true);
      await api.deleteReminder(id, authToken);
      if (editingReminderId === id) onCancelEditReminder();
      await fetchReminders();
    } catch (e) {
      showError('Silme hatası', e);
    } finally {
      setLoading(false);
    }
  };

  const onLoadHistory = async () => {
    if (!selectedPet?.id) return;
    try {
      setLoading(true);
      const data = await api.getPetReminderHistory(selectedPet.id, authToken);
      setHistory(Array.isArray(data) ? data : []);
      setHistoryLoaded(true);
    } catch (e) {
      showError('Geçmiş hatası', e);
    } finally {
      setLoading(false);
    }
  };

  // --- Analyze handler -----------------------------------------------------------------
  const onAnalyze = async () => {
    if (!selectedPet?.id) {
      Alert.alert('Uyarı', 'Önce bir pati seç.');
      return;
    }
    try {
      setLoading(true);
      const data = await api.analyzeMeow(selectedPet.id, authToken);
      setAnalyzeResult(data);
    } catch (e) {
      showError('Analiz hatası', e);
    } finally {
      setLoading(false);
    }
  };

  // --- Chat handler -----------------------------------------------------------------------
  const onSendChat = async () => {
    const text = prompt.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setPrompt('');
    try {
      setLoading(true);
      const data = await api.askChatbot({ question: text, pet_id: selectedPet?.id }, authToken);
      setMessages((m) => [...m, { role: 'assistant', text: data?.answer || 'Yanıt alınamadı.' }]);
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'AI yanıtı alınamadı.';
      setMessages((m) => [...m, { role: 'assistant', text: message }]);
    } finally {
      setLoading(false);
    }
  };

  if (bootLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!authToken) {
    return <AuthScreen onLogin={onLogin} onRegister={onRegister} loading={authLoading} />;
  }

  const upcomingReminders = reminders;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icon =
            route.name === 'Ana Sayfa' ? 'home' :
            route.name === 'Profil' ? 'person' :
            route.name === 'Hatırlatıcı' ? 'notifications' :
            route.name === 'Analiz' ? 'mic' : 'chatbubble';
          return <Ionicons name={icon} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <TouchableOpacity onPress={onLogout} style={{ marginRight: 16 }}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Ana Sayfa">
        {() => (
          <HomeScreen
            userName={userName}
            pets={pets}
            selectedIndex={selected}
            onSelectPet={setSelected}
            onAddPetPress={onAddDraftPet}
            selectedPet={selectedPet}
            upcomingReminders={upcomingReminders}
            refreshing={refreshing}
            onRefresh={onRefreshDashboard}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Profil">
        {() => (
          <ProfileScreen
            pets={pets}
            selectedIndex={selected}
            onSelectPet={setSelected}
            draftPet={draftPet}
            setDraftPet={setDraftPet}
            onAddDraftPet={onAddDraftPet}
            onSavePet={onSavePet}
            onDeletePet={onDeletePet}
            isNewPet={isNewPet}
            loading={loading}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Hatırlatıcı">
        {() => (
          <ReminderScreen
            selectedPet={selectedPet}
            reminders={reminders}
            history={history}
            historyLoaded={historyLoaded}
            form={reminderForm}
            setForm={setReminderForm}
            onAdd={onAddReminder}
            onUpdate={onUpdateReminder}
            onCancelEdit={onCancelEditReminder}
            editingId={editingReminderId}
            onEdit={onEditReminder}
            onDelete={onDeleteReminder}
            onLoadHistory={onLoadHistory}
            loading={loading}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Analiz">
        {() => (
          <AnalyzeScreen
            selectedPet={selectedPet}
            result={analyzeResult}
            onAnalyze={onAnalyze}
            loading={loading}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Chat">
        {() => (
          <ChatScreen
            messages={messages}
            prompt={prompt}
            setPrompt={setPrompt}
            onSend={onSendChat}
            loading={loading}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}