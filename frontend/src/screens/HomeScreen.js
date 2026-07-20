import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
  Modal, FlatList,
} from 'react-native';
import { colors } from '../theme';
import { useTransactions } from '../hooks/useTransactions';
import TransactionRow from '../components/TransactionRow';
import InputBar from '../components/InputBar';
import { PieChartIcon, SettingsIcon, SplitIcon } from '../components/Icons';
import { CURRENCIES } from '../utils/categories';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENCY_KEY = 'ledger_currency';
const PERIODS = ['today', 'this-week', 'this-month'];
const PERIOD_NAMES = { today: 'Today', 'this-week': 'This week', 'this-month': 'This month' };

function periodBounds(period) {
  const now = new Date();
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (period === 'this-week') {
    const day = now.getDay();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day).getTime();
  }
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

function periodLabel(period) {
  const now = new Date();
  if (period === 'today') return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  if (period === 'this-week') {
    const day = now.getDay();
    const sun = new Date(now); sun.setDate(now.getDate() - day);
    const sat = new Date(sun); sat.setDate(sun.getDate() + 6);
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(sun)} – ${fmt(sat)}`;
  }
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function HomeScreen({ navigation }) {
  const { transactions, loading, addTransaction, removeTransaction } = useTransactions();
  const [periodIdx, setPeriodIdx] = useState(0);
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [showCurrency, setShowCurrency] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CURRENCY_KEY).then(code => {
      const saved = CURRENCIES.find(c => c.code === code);
      if (saved) setCurrency(saved);
    }).catch(() => {});
  }, []);

  function pickCurrency(item) {
    setCurrency(item);
    setShowCurrency(false);
    AsyncStorage.setItem(CURRENCY_KEY, item.code).catch(() => {});
  }

  const period = PERIODS[periodIdx];
  const start  = periodBounds(period);
  const filtered = useMemo(() => transactions.filter(tx => tx.ts >= start).sort((a, b) => b.ts - a.ts), [transactions, start]);
  const spent  = useMemo(() => filtered.filter(t => !t.isIncome).reduce((a, t) => a + t.amount, 0), [filtered]);

  const sym = currency.symbol;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Ledger<Text style={{ color: colors.accent }}>.</Text></Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowCurrency(true)}>
            <Text style={styles.iconBtnText}>{currency.code}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Analytics', { currency })}>
            <PieChartIcon size={20} color="rgba(255,255,255,0.55)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Split', { currency })}>
            <SplitIcon size={20} color="rgba(255,255,255,0.55)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings')}>
            <SettingsIcon size={20} color="rgba(255,255,255,0.55)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Spent hero */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>SPENT</Text>
        <Text style={styles.heroAmount}>{sym}{spent.toFixed(2)}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Calendar', { currency })}>
          <Text style={styles.heroPeriod}>{periodLabel(period)}</Text>
        </TouchableOpacity>
      </View>

      {/* Period slider */}
      <View style={styles.periodSlider}>
        <TouchableOpacity onPress={() => setPeriodIdx((periodIdx - 1 + 3) % 3)} style={styles.arrow}>
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.periodLabelBtn} onPress={() => navigation.navigate('Calendar', { currency })}>
          <Text style={styles.periodLabel}>{PERIOD_NAMES[period]}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPeriodIdx((periodIdx + 1) % 3)} style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Transaction list */}
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ flex: 1 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Nothing {PERIOD_NAMES[period].toLowerCase()}</Text>
          <Text style={styles.emptySub}>Type below to log a spend or income</Text>
        </View>
      ) : (
        <ScrollView style={styles.log} showsVerticalScrollIndicator={false}>
          {filtered.map(tx => (
            <TransactionRow key={tx.id} tx={tx} onDelete={removeTransaction} symbol={sym} />
          ))}
        </ScrollView>
      )}

      {/* Input bar */}
      <InputBar onAdd={addTransaction} />

      {/* Currency picker modal */}
      <Modal visible={showCurrency} animationType="slide" transparent onRequestClose={() => setShowCurrency(false)}>
        <TouchableOpacity style={styles.overlay} onPress={() => setShowCurrency(false)} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Currency</Text>
          <FlatList
            data={CURRENCIES}
            numColumns={2}
            keyExtractor={item => item.code}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.currItem, currency.code === item.code && styles.currItemActive]}
                onPress={() => pickCurrency(item)}
              >
                <Text style={styles.currFlag}>{item.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.currCode}>{item.code}</Text>
                  <Text style={styles.currName} numberOfLines={1}>{item.name}</Text>
                </View>
                <Text style={[styles.currSym, currency.code === item.code && { color: colors.accent }]}>{item.symbol}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 32, paddingBottom: 14 },
  logo:        { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.6 },
  actions:     { flexDirection: 'row', gap: 8 },
  iconBtn:     { height: 46, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: 'rgba(255,255,255,0.55)', fontSize: 20, fontWeight: '600' },
  hero:        { paddingHorizontal: 20, paddingBottom: 18 },
  heroLabel:   { fontSize: 12, fontWeight: '500', letterSpacing: 2, color: colors.textMuted, marginBottom: 6 },
  heroAmount:  { fontFamily: 'Courier', fontSize: 46, fontWeight: '500', color: colors.text, letterSpacing: -2 },
  heroPeriod:  { fontSize: 16, color: colors.textMuted, marginTop: 6 },
  periodSlider:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 16, gap: 8 },
  arrow:       { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  arrowText:   { fontSize: 24, color: 'rgba(255,255,255,0.45)' },
  periodLabelBtn: { flex: 1, alignItems: 'center' },
  periodLabel: { textAlign: 'center', fontSize: 18, fontWeight: '600', color: colors.text, letterSpacing: -0.4 },
  log:         { flex: 1, borderTopWidth: 1, borderTopColor: colors.border },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon:   { fontSize: 32, marginBottom: 4 },
  emptyTitle:  { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  emptySub:    { fontSize: 12, color: colors.textDim, textAlign: 'center' },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '70%' },
  sheetHandle: { width: 34, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetTitle:  { fontSize: 18, fontWeight: '700', color: colors.text, paddingHorizontal: 20, paddingVertical: 14 },
  currItem:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, margin: 3.5, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2 },
  currItemActive: { borderColor: 'rgba(34,197,94,0.4)', backgroundColor: colors.accentDim },
  currFlag:    { fontSize: 20 },
  currCode:    { fontFamily: 'Courier', fontSize: 13, fontWeight: '500', color: colors.text },
  currName:    { fontSize: 11, color: colors.textMuted },
  currSym:     { fontFamily: 'Courier', fontSize: 12, color: colors.textMuted },
});
