import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert,
} from 'react-native';
import { colors } from '../theme';
import {
  FREQUENCIES, getNotificationPrefs, setNotificationFrequency,
} from '../utils/notifications';

const OPTIONS = [
  { key: 'off',  title: FREQUENCIES.off.label,  desc: FREQUENCIES.off.sub },
  { key: 'once', title: FREQUENCIES.once.label, desc: FREQUENCIES.once.sub, recommended: true },
  { key: '3x',   title: FREQUENCIES['3x'].label, desc: FREQUENCIES['3x'].sub },
];

export default function NotificationSettingsScreen({ navigation }) {
  const [frequency, setFrequency] = useState('off');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    getNotificationPrefs().then(p => {
      setFrequency(p.frequency);
      setBusy(false);
    });
  }, []);

  async function selectFrequency(key) {
    if (key === frequency) return;
    setBusy(true);
    const ok = await setNotificationFrequency(key);
    if (!ok) {
      Alert.alert(
        'Notifications disabled',
        'Enable notifications for Ledger in your device settings to turn on reminders.'
      );
    }
    setFrequency(ok ? key : 'off');
    setBusy(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionLabel}>REMINDER FREQUENCY</Text>
        <Text style={styles.sectionHint}>
          Get nudged to log your spending. We recommend once a day — more frequent
          reminders can feel like noise, but pick what works for you.
        </Text>

        <View style={styles.card}>
          {OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.row, i < OPTIONS.length - 1 && styles.rowBorder]}
              onPress={() => selectFrequency(opt.key)}
              activeOpacity={0.6}
              disabled={busy}
            >
              <View style={styles.rowBody}>
                <View style={styles.rowTitleLine}>
                  <Text style={styles.rowLabel}>{opt.title}</Text>
                  {opt.recommended && (
                    <View style={styles.badge}><Text style={styles.badgeText}>Recommended</Text></View>
                  )}
                </View>
                <Text style={styles.rowSub}>{opt.desc}</Text>
              </View>
              <View style={[styles.radio, frequency === opt.key && styles.radioActive]}>
                {frequency === opt.key && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: colors.bg },
  nav:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 34, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:   { paddingHorizontal: 8, paddingVertical: 6 },
  backText:  { color: colors.accent, fontSize: 16, fontWeight: '500' },
  title:     { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text, marginRight: 60 },
  body:      { padding: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 6 },
  sectionHint:  { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 16 },
  card:      { borderRadius: 14, backgroundColor: colors.surface, overflow: 'hidden' },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowBody:   { flex: 1 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel:  { fontSize: 15, fontWeight: '500', color: colors.text },
  rowSub:    { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge:     { backgroundColor: colors.accentDim, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.accent },
  radio:     { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textDim, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.accent },
  radioDot:  { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.accent },
});
