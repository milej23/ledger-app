import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { colors } from '../theme';
import { FREQUENCIES, getNotificationPrefs } from '../utils/notifications';

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(auth.currentUser);
  const [notifFrequency, setNotifFrequency] = useState('off');

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useFocusEffect(
    useCallback(() => {
      getNotificationPrefs().then(p => setNotifFrequency(p.frequency));
    }, [])
  );

  function handleSignOut() {
    Alert.alert('Sign out?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  }

  const rows = [
    { icon: '👤', label: user ? user.email : 'Sign in / Sign up', sub: user ? 'Signed in' : 'Sync across devices', onPress: () => navigation.navigate('Auth') },
    { icon: '🔔', label: 'Notifications', sub: FREQUENCIES[notifFrequency].label, onPress: () => navigation.navigate('NotificationSettings') },
    { icon: '💬', label: 'Feedback', sub: 'Report a bug or suggest a feature', onPress: () => Alert.alert('Coming soon') },
    { icon: '🔒', label: 'Passcode', sub: 'Lock the app with a PIN', onPress: () => Alert.alert('Coming soon') },
    { icon: '💾', label: 'Backup', sub: 'Export or restore your data', onPress: () => Alert.alert('Coming soon') },
  ];

  if (user) {
    rows.push({ icon: '🚪', label: 'Sign out', sub: user.email, onPress: handleSignOut });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.body}>
        {rows.map((row, i) => (
          <TouchableOpacity key={i} style={styles.row} onPress={row.onPress} activeOpacity={0.6}>
            <View style={styles.iconWrap}><Text style={styles.rowIcon}>{row.icon}</Text></View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowSub}>{row.sub}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: colors.bg },
  nav:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 34, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:  { paddingHorizontal: 8, paddingVertical: 6 },
  backText: { color: colors.accent, fontSize: 16, fontWeight: '500' },
  title:    { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text, marginRight: 60 },
  body:     { padding: 16 },
  row:      { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconWrap: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  rowIcon:  { fontSize: 18 },
  rowBody:  { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: colors.text },
  rowSub:   { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chevron:  { fontSize: 20, color: colors.textDim },
});
