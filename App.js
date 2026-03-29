import { Ionicons } from '@expo/vector-icons'; // Expo ile hazır gelen ikon kütüphanesi
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

// Ekran Taslakları
function HomeScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Pati'ye Hoş Geldin!</Text>
      <Text>Bugün dostun nasıl hissediyor?</Text>
    </View>
  );
}

function ChatScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Pati Asistan</Text>
      <Text>Sorularını bekliyorum...</Text>
    </View>
  );
}

function AnalysisScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Ses Analizi</Text>
      <Text>Miyavlama kaydetmek için dokun.</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Ana Sayfa') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'Asistan') iconName = focused ? 'chatbubble' : 'chatbubble-outline';
            else if (route.name === 'Analiz') iconName = focused ? 'mic' : 'mic-outline';
            
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#FF9F43',
          tabBarInactiveTintColor: 'gray',
          headerStyle: { backgroundColor: '#FF9F43' },
          headerTintColor: '#fff',
        })}
      >
        <Tab.Screen name="Ana Sayfa" component={HomeScreen} />
        <Tab.Screen name="Asistan" component={ChatScreen} />
        <Tab.Screen name="Analiz" component={AnalysisScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FF9F43', marginBottom: 10 }
});