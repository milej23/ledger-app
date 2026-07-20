import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'notificationPrefs';

// 'off' | 'once' | '3x'
export const FREQUENCIES = {
  off:  { label: 'Off',            sub: 'No reminders' },
  once: { label: 'Once a day',     sub: '8:00 PM' },
  '3x': { label: '3 times a day',  sub: 'Morning, dinner & before bed' },
};

const SCHEDULES = {
  once: [
    { hour: 20, minute: 0, title: 'Log today\'s spending', body: 'Add any transactions from today before you forget.' },
  ],
  '3x': [
    { hour: 9,  minute: 0, title: 'Good morning ☀️',        body: 'Off to a fresh start — log anything from last night?' },
    { hour: 18, minute: 30, title: 'Dinner time reminder', body: 'Quick check-in: add today\'s expenses so far.' },
    { hour: 22, minute: 0, title: 'Before you sleep 🌙',   body: 'Last call to log today\'s transactions.' },
  ],
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getNotificationPrefs() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : { frequency: 'off' };
}

export async function setNotificationFrequency(frequency) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (frequency !== 'off') {
    const granted = await ensurePermission();
    if (!granted) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ frequency: 'off' }));
      return false;
    }
    for (const slot of SCHEDULES[frequency]) {
      await Notifications.scheduleNotificationAsync({
        content: { title: slot.title, body: slot.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: slot.hour,
          minute: slot.minute,
          repeats: true,
        },
      });
    }
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ frequency }));
  return true;
}

async function ensurePermission() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return status === 'granted';
}
