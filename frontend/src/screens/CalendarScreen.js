import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { colors } from '../theme';
import { useTransactions } from '../hooks/useTransactions';
import TransactionRow from '../components/TransactionRow';
import { parse } from '../utils/parser';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarScreen({ navigation, route }) {
  const { transactions, addTransaction, removeTransaction } = useTransactions();
  const sym = route.params?.currency?.symbol || '$';

  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [addText, setAddText] = useState('');
  const [warning, setWarning] = useState(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Map each day-of-month to whether it has expenses and/or income, so the
  // grid can show a dot without recomputing on every cell render.
  const daySpend = useMemo(() => {
    const map = {};
    transactions.forEach(tx => {
      const d = new Date(tx.ts);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate();
        if (!map[key]) map[key] = { expense: 0, income: 0 };
        if (tx.isIncome) map[key].income += tx.amount;
        else map[key].expense += tx.amount;
      }
    });
    return map;
  }, [transactions, year, month]);

  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const dayTransactions = useMemo(
    () => transactions.filter(tx => sameDay(new Date(tx.ts), selectedDate)).sort((a, b) => b.ts - a.ts),
    [transactions, selectedDate]
  );
  const daySpent  = dayTransactions.filter(t => !t.isIncome).reduce((a, t) => a + t.amount, 0);
  const dayIncome = dayTransactions.filter(t => t.isIncome).reduce((a, t) => a + t.amount, 0);

  function stepMonth(dir) {
    setViewDate(new Date(year, month + dir, 1));
  }

  function selectDay(day) {
    setSelectedDate(new Date(year, month, day));
  }

  function handleAdd() {
    const trimmed = addText.trim();
    if (!trimmed) return;
    const parsed = parse(trimmed);
    if (!parsed || parsed.tooLarge) {
      setWarning('Amount not recognized');
      setTimeout(() => setWarning(null), 2500);
      return;
    }
    const now = new Date();
    const ts = new Date(
      selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(),
      now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()
    ).getTime();
    addTransaction({ amount: parsed.amount, cat: parsed.cat, desc: parsed.desc, isIncome: parsed.isIncome, ts });
    setAddText('');
  }

  const todayStr = new Date().toDateString();
  const dayLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Calendar</Text>
      </View>

      <View style={styles.monthRow}>
        <TouchableOpacity onPress={() => stepMonth(-1)} style={styles.arrow}>
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity onPress={() => stepMonth(1)} style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((w, i) => <Text key={i} style={styles.weekdayText}>{w}</Text>)}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={styles.cell} />;
          const cellDate = new Date(year, month, day);
          const spend = daySpend[day];
          const isToday = cellDate.toDateString() === todayStr;
          const isSelected = sameDay(cellDate, selectedDate);
          const dotColor = spend ? (spend.expense > 0 ? colors.danger : colors.accent) : null;
          return (
            <TouchableOpacity
              key={i}
              style={styles.cell}
              onPress={() => selectDay(day)}
            >
              <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                <Text style={[
                  styles.cellText,
                  isToday && !isSelected && styles.cellTextToday,
                  isSelected && styles.cellTextSelected,
                ]}>{day}</Text>
              </View>
              {dotColor && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.dayPanel} showsVerticalScrollIndicator={false}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{dayLabel}</Text>
          <Text style={styles.dayTotal}>
            {sym}{daySpent.toFixed(2)}
            {dayIncome > 0 && <Text style={styles.dayIncome}> +{sym}{dayIncome.toFixed(2)}</Text>}
          </Text>
        </View>

        {dayTransactions.length === 0 ? (
          <Text style={styles.noData}>No transactions this day</Text>
        ) : (
          dayTransactions.map(tx => (
            <TransactionRow key={tx.id} tx={tx} onDelete={removeTransaction} symbol={sym} />
          ))
        )}
      </ScrollView>

      <View style={styles.addArea}>
        {warning && <Text style={styles.warning}>{warning}</Text>}
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={addText}
            onChangeText={setAddText}
            placeholder="Add a spend for this day…"
            placeholderTextColor={colors.textDim}
            maxLength={300}
            returnKeyType="send"
            onSubmitEditing={handleAdd}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !addText.trim() && styles.sendBtnDisabled]}
            onPress={handleAdd}
            disabled={!addText.trim()}
          >
            <Text style={[styles.sendIcon, !addText.trim() && styles.sendIconDisabled]}>▶</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const CELL_SIZE = `${100 / 7}%`;

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  nav:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 34, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:     { paddingHorizontal: 8, paddingVertical: 6 },
  backText:    { color: colors.accent, fontSize: 16, fontWeight: '500' },
  title:       { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text, marginRight: 60 },
  monthRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  arrow:       { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  arrowText:   { fontSize: 24, color: 'rgba(255,255,255,0.45)' },
  monthLabel:  { fontSize: 16, fontWeight: '600', color: colors.text },
  weekdayRow:  { flexDirection: 'row', paddingHorizontal: 12 },
  weekdayText: { width: CELL_SIZE, textAlign: 'center', fontSize: 11, color: colors.textDim, fontWeight: '600' },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 8 },
  cell:        { width: CELL_SIZE, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dayCircle:   { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dayCircleSelected: { backgroundColor: colors.accentDim },
  cellText:    { fontSize: 14, color: colors.text, textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' },
  cellTextToday:   { color: colors.accent, fontWeight: '700' },
  cellTextSelected:{ color: colors.accent, fontWeight: '700' },
  dot:         { width: 5, height: 5, borderRadius: 2.5 },
  dayPanel:    { flex: 1, borderTopWidth: 1, borderTopColor: colors.border },
  dayHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  dayTitle:    { fontSize: 15, fontWeight: '600', color: colors.text },
  dayTotal:    { fontFamily: 'Courier', fontSize: 15, color: colors.text },
  dayIncome:   { color: colors.accent, fontSize: 13 },
  noData:      { textAlign: 'center', padding: 30, fontSize: 13, color: colors.textDim },
  addArea:     { paddingHorizontal: 12, paddingVertical: 6, paddingBottom: 12, backgroundColor: colors.bg },
  warning:     { color: 'rgba(244,63,94,0.9)', fontSize: 12, fontWeight: '600', marginBottom: 6, marginLeft: 6 },
  addRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 22,
    paddingVertical: 10, paddingLeft: 18, paddingRight: 10, gap: 10,
  },
  addInput:    { flex: 1, color: colors.text, fontSize: 15 },
  sendBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.surface2 },
  sendIcon:        { color: colors.bg, fontSize: 14 },
  sendIconDisabled:{ color: colors.textDim },
});
