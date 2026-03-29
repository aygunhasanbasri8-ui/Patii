import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';

// --- 1. EKRAN: ANA SAYFA (TAKVİMLİ HATIRLATICI) ---
function HomeScreen({ petList, setPetList }) {
  const [selectedPet, setSelectedPet] = useState(null);
  const [reminderText, setReminderText] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Hatırlatıcı Ekleme
  const addReminder = async () => {
    if (!reminderText) return;
    
    // Tarihi okunabilir formata çeviriyoruz (Örn: 15/05/2026)
    const formattedDate = date.toLocaleDateString('tr-TR');

    const updatedList = petList.map(pet => {
      if (pet.id === selectedPet.id) {
        const newReminders = [
          ...(pet.reminders || []), 
          { id: Date.now().toString(), text: reminderText, date: formattedDate }
        ];
        const updatedPet = { ...pet, reminders: newReminders };
        setSelectedPet(updatedPet); 
        return updatedPet;
      }
      return pet;
    });

    setPetList(updatedList);
    await AsyncStorage.setItem('@pet_list', JSON.stringify(updatedList));
    setReminderText('');
  };

  const deleteReminder = async (reminderId) => {
    const updatedList = petList.map(pet => {
      if (pet.id === selectedPet.id) {
        const newReminders = pet.reminders.filter(r => r.id !== reminderId);
        const updatedPet = { ...pet, reminders: newReminders };
        setSelectedPet(updatedPet);
        return updatedPet;
      }
      return pet;
    });
    setPetList(updatedList);
    await AsyncStorage.setItem('@pet_list', JSON.stringify(updatedList));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerPadding}>
        <Text style={styles.welcomeText}>Pati Ailesi</Text>
        <FlatList
          data={petList}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.petCard} onPress={() => setSelectedPet(item)}>
              <Image source={item.photo ? { uri: item.photo } : { uri: 'https://via.placeholder.com/100' }} style={styles.petAvatar} />
              <Text style={styles.petNameText}>{item.name}</Text>
              <Text style={styles.petBreedText}>{item.breed}</Text>
            </TouchableOpacity>
          )}
        />

        {/* --- DETAY MODALI --- */}
        <Modal visible={selectedPet !== null} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedPet(null)}>
                <Ionicons name="close-circle" size={32} color="#FF9F43" />
              </TouchableOpacity>
              
              {selectedPet && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Image source={selectedPet.photo ? { uri: selectedPet.photo } : { uri: 'https://via.placeholder.com/150' }} style={styles.detailImage} />
                  <Text style={styles.detailName}>{selectedPet.name}</Text>
                  
                  <View style={styles.divider} />

                  <Text style={styles.sectionTitleSmall}>Hatırlatıcı Oluştur</Text>
                  <View style={styles.reminderAddBox}>
                    <TextInput 
                      style={styles.reminderInput} 
                      placeholder="Örn: Veteriner Randevusu" 
                      value={reminderText}
                      onChangeText={setReminderText}
                    />
                    
                    <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
                      <Ionicons name="calendar-outline" size={20} color="#FF9F43" />
                      <Text style={{marginLeft: 5, color: '#FF9F43'}}>{date.toLocaleDateString('tr-TR')}</Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                      <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(false);
                          if (selectedDate) setDate(selectedDate);
                        }}
                      />
                    )}

                    <TouchableOpacity style={styles.fullAddBtn} onPress={addReminder}>
                      <Text style={{color:'#fff', fontWeight:'bold'}}>Hatırlatıcıyı Kaydet</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.sectionTitleSmall}>Planlananlar</Text>
                  {(selectedPet.reminders || []).map(r => (
                    <View key={r.id} style={styles.reminderItem}>
                      <View style={{flex: 1}}>
                        <Text style={{fontWeight: 'bold', color: '#333'}}>{r.text}</Text>
                        <Text style={{fontSize: 12, color: '#FF9F43'}}>{r.date}</Text>
                      </View>
                      <TouchableOpacity onPress={() => deleteReminder(r.id)}>
                        <Ionicons name="trash-outline" size={20} color="#ff4d4d" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

// ... (ChatScreen, AnalysisScreen, ProfileScreen ve Page yapıları bir önceki kodla aynı kalacak şekilde devam eder)

// --- PROFİL EKRANI ---
function ProfileScreen({ petList, onAddPet, onDeletePet }) {
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [photo, setPhoto] = useState(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const handleAdd = () => {
    if (!name || !breed) return Alert.alert("Hata", "Lütfen tüm bilgileri doldur Chef!");
    onAddPet({ id: Date.now().toString(), name, breed, photo, reminders: [] });
    setName(''); setBreed(''); setPhoto(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.profileContainer}>
      <Text style={styles.sectionTitle}>Yeni Dost Ekle</Text>
      <View style={styles.addArea}>
        <TouchableOpacity onPress={pickImage} style={styles.miniPicker}>
          {photo ? <Image source={{ uri: photo }} style={styles.miniPhoto} /> : <Ionicons name="camera" size={24} color="#FF9F43" />}
        </TouchableOpacity>
        <TextInput style={styles.miniInput} placeholder="Pati Adı" value={name} onChangeText={setName} />
        <TextInput style={styles.miniInput} placeholder="Cinsi" value={breed} onChangeText={setBreed} />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}><Text style={{color:'#fff', fontWeight:'bold'}}>Listeye Ekle</Text></TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, {marginTop: 30}]}>Dostlarım</Text>
      {petList.map(pet => (
        <View key={pet.id} style={styles.listItem}>
          <Image source={pet.photo ? { uri: pet.photo } : { uri: 'https://via.placeholder.com/50' }} style={styles.listThumb} />
          <Text style={{flex: 1, marginLeft: 10, fontWeight: 'bold'}}>{pet.name}</Text>
          <TouchableOpacity onPress={() => onDeletePet(pet.id)}><Ionicons name="trash-outline" size={20} color="red" /></TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

// --- CHAT VE ANALİZ EKRANLARI (DEĞİŞMEDİ) ---
function ChatScreen() {
  const [messages, setMessages] = useState([{ id: '1', text: 'Selam Chef! Patili dostun hakkında neyi merak ediyorsun?', isUser: false }]);
  const [input, setInput] = useState('');
  const sendMessage = () => {
    if (!input) return;
    setMessages([...messages, { id: Date.now().toString(), text: input, isUser: true }]);
    setInput('');
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1, backgroundColor: '#fff'}}>
      <ScrollView contentContainerStyle={{padding: 20}}>
        {messages.map(m => (
          <View key={m.id} style={[styles.chatBubble, m.isUser ? styles.userBubble : styles.aiBubble]}>
            <Text style={{color: m.isUser ? '#fff' : '#333'}}>{m.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.inputArea}>
        <TextInput style={styles.chatInput} placeholder="Bir şeyler sor..." value={input} onChangeText={setInput} />
        <TouchableOpacity onPress={sendMessage}><Ionicons name="send" size={24} color="#FF9F43" /></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function AnalysisScreen() {
  const [isRecording, setIsRecording] = useState(false);
  return (
    <View style={styles.center}>
      <Text style={styles.welcomeText}>Miyavlama Analizi</Text>
      <TouchableOpacity style={[styles.recordButton, isRecording && {backgroundColor: '#ff4d4d'}]} onPress={() => setIsRecording(!isRecording)}>
        <Ionicons name={isRecording ? "stop" : "mic"} size={50} color="#fff" />
      </TouchableOpacity>
      <Text style={{marginTop: 20, fontWeight: 'bold', color: isRecording ? '#ff4d4d' : '#FF9F43'}}>
        {isRecording ? "Ses Analiz Ediliyor..." : "Kaydetmek için dokun"}
      </Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();

export default function Page() {
  const [petList, setPetList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem('@pet_list');
      if (saved) setPetList(JSON.parse(saved));
      setLoading(false);
    };
    load();
  }, []);

  const addPet = async (p) => {
    const newList = [...petList, p]; setPetList(newList);
    await AsyncStorage.setItem('@pet_list', JSON.stringify(newList));
  };

  const deletePet = async (id) => {
    const newList = petList.filter(p => p.id !== id); setPetList(newList);
    await AsyncStorage.setItem('@pet_list', JSON.stringify(newList));
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#FF9F43" size="large" /></View>;

  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#FF9F43', headerStyle: { backgroundColor: '#FF9F43' }, headerTintColor: '#fff' }}>
      <Tab.Screen name="Ana Sayfa" options={{ tabBarIcon: ({color}) => <Ionicons name="home" color={color} size={22}/> }}>
        {() => <HomeScreen petList={petList} setPetList={setPetList} />}
      </Tab.Screen>
      <Tab.Screen name="Asistan" options={{ tabBarIcon: ({color}) => <Ionicons name="chatbubble" color={color} size={22}/> }} component={ChatScreen} />
      <Tab.Screen name="Analiz" options={{ tabBarIcon: ({color}) => <Ionicons name="mic" color={color} size={22}/> }} component={AnalysisScreen} />
      <Tab.Screen name="Profil" options={{ tabBarIcon: ({color}) => <Ionicons name="paw" color={color} size={22}/> }}>
        {() => <ProfileScreen petList={petList} onAddPet={addPet} onDeletePet={deletePet} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfcfc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  headerPadding: { padding: 25 },
  welcomeText: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  petCard: { backgroundColor: '#fff', padding: 15, borderRadius: 25, marginRight: 15, alignItems: 'center', width: 140, elevation: 4 },
  petAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
  petNameText: { fontWeight: 'bold', fontSize: 16 },
  petBreedText: { fontSize: 12, color: '#888' },
  profileContainer: { padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#FF9F43', marginBottom: 15 },
  sectionTitleSmall: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10, marginTop: 10 },
  addArea: { backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 2 },
  miniPicker: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff3e0', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 15 },
  miniPhoto: { width: 70, height: 70, borderRadius: 35 },
  miniInput: { borderBottomWidth: 1, borderBottomColor: '#FF9F43', marginBottom: 15, padding: 8, fontSize: 16 },
  addButton: { backgroundColor: '#FF9F43', padding: 15, borderRadius: 12, alignItems: 'center' },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 15, marginBottom: 10, elevation: 1 },
  listThumb: { width: 50, height: 50, borderRadius: 25 },
  chatBubble: { padding: 12, borderRadius: 18, marginBottom: 10, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#FF9F43', borderBottomRightRadius: 2 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0', borderBottomLeftRadius: 2 },
  inputArea: { flexDirection: 'row', padding: 15, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center', backgroundColor: '#fff' },
  chatInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 25, paddingHorizontal: 18, paddingVertical: 10, marginRight: 10 },
  recordButton: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FF9F43', justifyContent: 'center', alignItems: 'center', elevation: 8 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 25, height: '85%' },
  closeButton: { alignSelf: 'center', marginBottom: 10 },
  detailImage: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center', marginBottom: 15 },
  detailName: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 15 },
  
  // YENİ HATIRLATICI STİLLERİ
  reminderAddBox: { backgroundColor: '#fdfdfd', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#eee', marginBottom: 20 },
  reminderInput: { borderBottomWidth: 1, borderBottomColor: '#ccc', padding: 8, marginBottom: 10 },
  datePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff3e0', padding: 10, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 15 },
  fullAddBtn: { backgroundColor: '#FF9F43', padding: 12, borderRadius: 10, alignItems: 'center' },
  reminderItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 1, borderLeftWidth: 4, borderLeftColor: '#FF9F43' }
});