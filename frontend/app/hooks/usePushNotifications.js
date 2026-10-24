import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as api from '../lib/api';

// Uygulama açıkken gelen hatırlatıcı da banner olarak görünsün
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function getPushToken() {
  // Web'de ve emülatörde Expo push token alınamıyor
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Hatırlatıcılar',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

/**
 * Giriş yapılınca cihazın push token'ını sunucuya kaydeder.
 * Dönen fonksiyon çıkışta çağrılır ki çıkış yapmış cihaza bildirim gitmesin.
 */
export function usePushNotifications(authToken) {
  const tokenRef = useRef(null);

  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getPushToken();
        if (!token || cancelled) return;
        await api.registerPushToken(token, Platform.OS, authToken);
        tokenRef.current = token;
      } catch (e) {
        // Bildirim alınamaması uygulamanın geri kalanını engellemesin
        console.warn('Bildirim kaydı yapılamadı:', e?.message || e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  return useCallback(async () => {
    const token = tokenRef.current;
    tokenRef.current = null;
    if (!token || !authToken) return;
    try {
      await api.unregisterPushToken(token, authToken);
    } catch (_e) {
      // Çıkış yine de yapılsın; token sunucuda kalırsa Expo'nun hatasıyla temizlenir
    }
  }, [authToken]);
}
