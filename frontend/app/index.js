import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HeaderHeightContext } from '@react-navigation/elements';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

import * as api from './lib/api';
import { ApiError } from './lib/api';

import { useAuth } from './hooks/useAuth';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { colors } from './theme/tokens';

import WebSidebar from './components/WebSidebar';

import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen, { toDraftPet } from './screens/ProfileScreen';
import ReminderScreen, { isValidReminderDate } from './screens/ReminderScreen';
import AnalyzeScreen from './screens/AnalyzeScreen';
import ChatScreen from './screens/ChatScreen';

const Tab = createBottomTabNavigator();
const EMPTY_DRAFT_PET = toDraftPet(null);
const EMPTY_REMINDER_FORM = { title: '', description: '', remind_at: '' };

const TAB_ICONS = {
  'Ana Sayfa': 'home',
  Profil: 'person',
  'Hatırlatıcı': 'notifications',
  Analiz: 'mic',
};

function getErrorMessage(error) {
  return error instanceof ApiError ? error.message : error?.message || 'Bilinmeyen bir hata oluştu.';
}

function showError(prefix, error) {
  Alert.alert(prefix, getErrorMessage(error));
}

// Boş alan ya da hatalı tarih varsa uyarıyı gösterip false döner
function validateReminderForm({ title, description, remind_at }) {
  if (!title.trim() || !description.trim() || !remind_at.trim()) {
    Alert.alert('Eksik alan', 'Tüm alanları doldurmalısın.');
    return false;
  }
  if (!isValidReminderDate(remind_at.trim())) {
    Alert.alert('Geçersiz tarih', 'Tarihi gg/aa/yyyy formatında gir. Örn: 15/04/2026');
    return false;
  }
  return true;
}

export default function Page() {
  const auth = useAuth();
  const { authToken, userName, userId } = auth;
  const audioRecorder = useAudioRecorder();

  const [bootLoading, setBootLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [pets, setPets] = useState([]);
  const [selected, setSelected] = useState(0);
  const [draftPet, setDraftPet] = useState(EMPTY_DRAFT_PET);

  const [reminders, setReminders] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [reminderForm, setReminderForm] = useState(EMPTY_REMINDER_FORM);
  const [editingReminderId, setEditingReminderId] = useState(null);

  const [analyzeResult, setAnalyzeResult] = useState(null);
  // 'idle' | 'recording' | 'uploading'
  const [recordingState, setRecordingState] = useState('idle');

  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');

  const [webTab, setWebTab] = useState('home');

  const selectedPet = useMemo(() => pets[selected] || null, [pets, selected]);
  const isNewPet = !selectedPet?.id;

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

  // Açılışta kayıtlı oturumu geri yükle
  useEffect(() => {
    const init = async () => {
      try {
        const restored = await auth.restore();
        if (restored) {
          await fetchPets(restored.token, restored.userId);
        }
      } catch (_e) {
        showError('Başlangıç hatası', new Error('Başlangıç verileri yüklenemedi.'));
      } finally {
        setBootLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    setHistory([]);
    setHistoryLoaded(false);
    setEditingReminderId(null);
    setReminderForm(EMPTY_REMINDER_FORM);
    if (selectedPet?.id && authToken) {
      fetchReminders().catch((e) => showError('Hata', e));
    } else {
      setReminders([]);
    }
  }, [selectedPet?.id, authToken, fetchReminders]);

  // selectedPet nesnesine değil alanlarına bağlı: liste yenilenince düzenlenen form ezilmesin
  useEffect(() => {
    setDraftPet(toDraftPet(selectedPet));
  }, [selected, selectedPet?.name, selectedPet?.species, selectedPet?.breed, // eslint-disable-line react-hooks/exhaustive-deps
      selectedPet?.avatar_type, selectedPet?.avatar_value]);

  useEffect(() => {
    if (recordingState === 'recording') {
      audioRecorder.cancel();
      setRecordingState('idle');
    }
    setAnalyzeResult(null);
  }, [selected]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  // Hata olursa kutuda gösterilir, çağırana fallback döner
  const runAuthAction = async (action, fallback) => {
    try {
      setAuthLoading(true);
      return await action();
    } catch (e) {
      setAuthError(getErrorMessage(e));
      return fallback;
    } finally {
      setAuthLoading(false);
    }
  };

  const onLogin = async ({ email, password }) => {
    setAuthError(null);
    if (!email.trim() || !password) {
      setAuthError('E-posta ve şifre girmelisin.');
      return;
    }
    await runAuthAction(async () => {
      const { token, userId: uid } = await auth.login(email.trim(), password);
      await fetchPets(token, uid);
    });
  };

  const onRegister = async ({ full_name, email, password }) => {
    setAuthError(null);
    if (!full_name.trim() || !email.trim() || !password) {
      setAuthError('Tüm alanları doldurmalısın.');
      return false;
    }
    if (password.length < 6) {
      setAuthError('Şifre en az 6 karakter olmalı.');
      return false;
    }
    return runAuthAction(
      async () => (await auth.register(full_name.trim(), email.trim(), password)) ?? true,
      false
    );
  };

  const onVerifyEmail = async ({ email, code }) => {
    setAuthError(null);
    return runAuthAction(async () => {
      await api.verifyEmail({ email, code });
      return true;
    }, false);
  };

  const onResendVerification = async ({ email }) => {
    setAuthError(null);
    return runAuthAction(() => api.resendVerification({ email }), null);
  };

  const onForgotPassword = async ({ email }) => {
    setAuthError(null);
    if (!email.trim()) {
      setAuthError('E-posta adresini girmelisin.');
      return false;
    }
    return runAuthAction(
      async () => (await api.forgotPassword({ email: email.trim() })) ?? true,
      false
    );
  };

  const onResetPassword = async ({ email, code, new_password }) => {
    setAuthError(null);
    return runAuthAction(async () => {
      await api.resetPassword({ email, code, new_password });
      return true;
    }, false);
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

    // Fotoğraf yerel URI ise ayrıca yüklenmesi gerekir. Sunucudaki fotoğraf ya
    // göreli (/static/...) ya da nesne depolamadaysa mutlak http(s) adresidir.
    const isLocalPhoto =
      draftPet.avatar_type === 'photo' &&
      draftPet.avatar_value &&
      !draftPet.avatar_value.startsWith('/static/') &&
      !/^https?:\/\//.test(draftPet.avatar_value);

    try {
      setLoading(true);
      if (selectedPet?.id) {
        // Düzenleme: ikon doğrudan payload'a, fotoğraf ayrı endpoint'e
        await api.updatePet(
          selectedPet.id,
          {
            name, species, breed,
            avatar_type: isLocalPhoto ? selectedPet.avatar_type : draftPet.avatar_type,
            avatar_value: isLocalPhoto ? selectedPet.avatar_value : draftPet.avatar_value,
          },
          authToken
        );
        if (isLocalPhoto) {
          await api.uploadPetAvatar(selectedPet.id, draftPet.avatar_value, authToken);
        }
      } else {
        // Yeni pati: ikon payload'a, fotoğraf sonradan yükle
        const resp = await api.addPet(
          {
            name, species, breed,
            avatar_type: isLocalPhoto ? null : draftPet.avatar_type,
            avatar_value: isLocalPhoto ? null : draftPet.avatar_value,
          },
          authToken
        );
        if (isLocalPhoto && resp?.pet_id) {
          await api.uploadPetAvatar(resp.pet_id, draftPet.avatar_value, authToken);
        }
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

  const onAddReminder = async () => {
    if (!selectedPet?.id) {
      Alert.alert('Uyarı', 'Önce bir pati seç.');
      return;
    }
    if (!validateReminderForm(reminderForm)) return;
    const { title, description, remind_at } = reminderForm;
    try {
      setLoading(true);
      await api.addReminder(
        { pet_id: selectedPet.id, title: title.trim(), description: description.trim(), remind_at: remind_at.trim() },
        authToken
      );
      setReminderForm(EMPTY_REMINDER_FORM);
      await fetchReminders();
    } catch (e) {
      showError('Hatırlatıcı hatası', e);
    } finally {
      setLoading(false);
    }
  };

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
    setReminderForm(EMPTY_REMINDER_FORM);
  };

  const onUpdateReminder = async () => {
    if (!editingReminderId) return;
    if (!validateReminderForm(reminderForm)) return;
    const { title, description, remind_at } = reminderForm;
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

  const onToggleRecording = async () => {
    if (!selectedPet?.id) {
      Alert.alert('Uyarı', 'Önce bir pati seç.');
      return;
    }

    if (recordingState === 'recording') {
      try {
        const uri = await audioRecorder.stop();
        setRecordingState('uploading');
        const data = await api.analyzeMeow(selectedPet.id, authToken, uri);
        setAnalyzeResult(data);
      } catch (e) {
        showError('Analiz hatası', e);
      } finally {
        setRecordingState('idle');
      }
      return;
    }

    try {
      await audioRecorder.start();
      setRecordingState('recording');
    } catch (e) {
      showError('Mikrofon hatası', e);
    }
  };

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
    return (
      <AuthScreen
        onLogin={onLogin}
        onRegister={onRegister}
        onVerifyEmail={onVerifyEmail}
        onResendVerification={onResendVerification}
        onForgotPassword={onForgotPassword}
        onResetPassword={onResetPassword}
        loading={authLoading}
        error={authError}
        onClearError={clearAuthError}
      />
    );
  }

  const homeProps = {
    userName,
    pets,
    selectedIndex: selected,
    onSelectPet: setSelected,
    selectedPet,
    upcomingReminders: reminders,
    refreshing,
    onRefresh: onRefreshDashboard,
  };
  const profileProps = {
    pets,
    selectedIndex: selected,
    onSelectPet: setSelected,
    draftPet,
    setDraftPet,
    onAddDraftPet,
    onSavePet,
    onDeletePet,
    isNewPet,
    loading,
  };
  const reminderProps = {
    selectedPet,
    reminders,
    history,
    historyLoaded,
    form: reminderForm,
    setForm: setReminderForm,
    onAdd: onAddReminder,
    onUpdate: onUpdateReminder,
    onCancelEdit: onCancelEditReminder,
    editingId: editingReminderId,
    onEdit: onEditReminder,
    onDelete: onDeleteReminder,
    onLoadHistory,
    loading,
  };
  const analyzeProps = {
    selectedPet,
    result: analyzeResult,
    recordingState,
    onToggleRecording,
  };
  const chatProps = {
    messages,
    prompt,
    setPrompt,
    onSend: onSendChat,
    loading,
  };

  if (Platform.OS === 'web') {
    const webScreens = {
      home: <HomeScreen {...homeProps} />,
      profile: <ProfileScreen {...profileProps} />,
      reminders: <ReminderScreen {...reminderProps} />,
      analyze: <AnalyzeScreen {...analyzeProps} />,
      chat: <ChatScreen {...chatProps} />,
    };
    return (
      <View style={webDashStyles.root}>
        <WebSidebar
          activeTab={webTab}
          onTabChange={setWebTab}
          userName={userName}
          onLogout={onLogout}
        />
        {/* HeaderHeightContext=0: useHeaderHeight() hook'unun navigator dışında crash etmesini önler */}
        <HeaderHeightContext.Provider value={0}>
          <View style={webDashStyles.content}>{webScreens[webTab]}</View>
        </HeaderHeightContext.Provider>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name] || 'chatbubble'} size={size} color={color} />
        ),
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
      <Tab.Screen name="Ana Sayfa">{() => <HomeScreen {...homeProps} />}</Tab.Screen>
      <Tab.Screen name="Profil">{() => <ProfileScreen {...profileProps} />}</Tab.Screen>
      <Tab.Screen name="Hatırlatıcı">{() => <ReminderScreen {...reminderProps} />}</Tab.Screen>
      <Tab.Screen name="Analiz">{() => <AnalyzeScreen {...analyzeProps} />}</Tab.Screen>
      <Tab.Screen name="Chat">{() => <ChatScreen {...chatProps} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

const webDashStyles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
});