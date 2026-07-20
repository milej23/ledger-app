import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ScrollView, StyleSheet,
} from 'react-native';
import { colors } from '../theme';
import { splitEqually } from '../utils/split';

const MODES = [
  { key: 'equal',  label: 'Split equally' },
  { key: 'custom', label: 'Custom amounts' },
  { key: 'full',   label: 'One person owes it all' },
];

export default function AddExpenseModal({ visible, people, initialExpense, onClose, onSubmit }) {
  const isEditing = !!initialExpense;
  const [description, setDescription] = useState('');
  const [amountText, setAmountText]   = useState('');
  const [paidBy, setPaidBy]           = useState(null);
  const [mode, setMode]               = useState('equal');
  const [participants, setParticipants] = useState([]); // personIds involved (equal/custom)
  const [customAmounts, setCustomAmounts] = useState({}); // personId -> text
  const [fullOwer, setFullOwer]       = useState(null);
  const [error, setError]             = useState(null);

  // Reset the form each time the modal is (re)opened — prefilled from
  // initialExpense when editing, otherwise blank. Editing always starts in
  // "custom" mode so the exact original shares are shown, even if the
  // expense was originally created as an equal or full split.
  useEffect(() => {
    if (visible) {
      if (initialExpense) {
        setDescription(initialExpense.description);
        setAmountText(String(initialExpense.amount));
        setPaidBy(initialExpense.paidBy);
        setMode('custom');
        setParticipants(initialExpense.shares.map(s => s.personId));
        setCustomAmounts(Object.fromEntries(initialExpense.shares.map(s => [s.personId, String(s.amount)])));
        setFullOwer(null);
      } else {
        setDescription('');
        setAmountText('');
        setPaidBy(people[0]?.id || null);
        setMode('equal');
        setParticipants(people.map(p => p.id));
        setCustomAmounts({});
        setFullOwer(null);
      }
      setError(null);
    }
  }, [visible, people, initialExpense]);

  // Decimal-pad keyboards in many locales type a comma ("12,50") —
  // parseFloat alone would silently read that as 12.
  const toNum = (t) => parseFloat(String(t ?? '').replace(',', '.'));

  const amount = toNum(amountText);
  const validAmount = Number.isFinite(amount) && amount > 0;

  const customTotal = useMemo(
    () => participants.reduce((a, id) => a + (toNum(customAmounts[id]) || 0), 0),
    [participants, customAmounts]
  );

  // Per-person preview for equal mode, computed with splitEqually so the
  // numbers shown are exactly the shares that will be saved (a plain
  // amount/n would show 33.33 three times for a 100.00 split).
  const equalShares = useMemo(() => {
    if (!validAmount || participants.length === 0) return {};
    const amounts = splitEqually(amount, participants.length);
    return Object.fromEntries(participants.map((id, i) => [id, amounts[i]]));
  }, [validAmount, amount, participants]);

  function toggleParticipant(id) {
    setParticipants(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleSubmit() {
    setError(null);
    const desc = description.trim();
    if (!desc) return setError('Enter a description');
    if (!validAmount) return setError('Enter a valid amount');
    if (!paidBy) return setError('Choose who paid');

    let shares = [];
    if (mode === 'equal') {
      const others = participants;
      if (others.length < 2) return setError('Select at least 2 people involved');
      const amounts = splitEqually(amount, others.length);
      shares = others.map((id, i) => ({ personId: id, amount: amounts[i] }));
    } else if (mode === 'custom') {
      // A single participant is fine as long as it isn't only the payer
      // (that's how a "one person owes it all" expense looks when edited).
      if (participants.length < 1) return setError('Select who was involved');
      shares = participants.map(id => ({ personId: id, amount: toNum(customAmounts[id]) || 0 }));
      if (shares.some(s => s.amount <= 0)) return setError('Enter an amount for everyone involved');
      if (shares.every(s => s.personId === paidBy)) return setError('Someone besides the payer must owe a part of it');
      if (Math.abs(customTotal - amount) > 0.01) return setError(`Amounts must add up to ${amount.toFixed(2)} (currently ${customTotal.toFixed(2)})`);
    } else if (mode === 'full') {
      if (!fullOwer) return setError('Choose who owes the full amount');
      if (fullOwer === paidBy) return setError('The payer can\'t also be the one who owes it all');
      shares = [{ personId: fullOwer, amount }];
    }

    onSubmit({ description: desc, amount, paidBy, shares });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{isEditing ? 'Edit expense' : 'Add expense'}</Text>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Dinner at Luigi's"
            placeholderTextColor={colors.textDim}
          />

          <Text style={styles.label}>Total amount</Text>
          <TextInput
            style={styles.input}
            value={amountText}
            onChangeText={setAmountText}
            placeholder="0.00"
            placeholderTextColor={colors.textDim}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Paid by</Text>
          <View style={styles.chipRow}>
            {people.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, paidBy === p.id && styles.chipActive]}
                onPress={() => setPaidBy(p.id)}
              >
                <Text style={[styles.chipText, paidBy === p.id && styles.chipTextActive]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Split</Text>
          <View style={styles.chipRow}>
            {MODES.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[styles.chip, mode === m.key && styles.chipActive]}
                onPress={() => setMode(m.key)}
              >
                <Text style={[styles.chipText, mode === m.key && styles.chipTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {(mode === 'equal' || mode === 'custom') && (
            <>
              <Text style={styles.label}>Who's involved</Text>
              {people.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.personRow}
                  onPress={() => toggleParticipant(p.id)}
                >
                  <View style={[styles.checkbox, participants.includes(p.id) && styles.checkboxChecked]}>
                    {participants.includes(p.id) && <Text style={styles.checkboxMark}>✓</Text>}
                  </View>
                  <Text style={styles.personName}>{p.name}</Text>
                  {mode === 'equal' && participants.includes(p.id) && validAmount && (
                    <Text style={styles.personShare}>
                      {equalShares[p.id]?.toFixed(2)}
                    </Text>
                  )}
                  {mode === 'custom' && participants.includes(p.id) && (
                    <TextInput
                      style={styles.shareInput}
                      value={customAmounts[p.id] || ''}
                      onChangeText={t => setCustomAmounts(prev => ({ ...prev, [p.id]: t }))}
                      placeholder="0.00"
                      placeholderTextColor={colors.textDim}
                      keyboardType="decimal-pad"
                    />
                  )}
                </TouchableOpacity>
              ))}
              {mode === 'custom' && validAmount && (
                <Text style={styles.helper}>
                  {customTotal.toFixed(2)} / {amount.toFixed(2)}
                </Text>
              )}
            </>
          )}

          {mode === 'full' && (
            <>
              <Text style={styles.label}>Who owes the full amount</Text>
              {people.filter(p => p.id !== paidBy).map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.personRow}
                  onPress={() => setFullOwer(p.id)}
                >
                  <View style={[styles.checkbox, fullOwer === p.id && styles.checkboxChecked]}>
                    {fullOwer === p.id && <Text style={styles.checkboxMark}>✓</Text>}
                  </View>
                  <Text style={styles.personName}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>{isEditing ? 'Save changes' : 'Add expense'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' },
  sheetHandle: { width: 34, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  title:       { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  label:       { fontSize: 12, fontWeight: '600', letterSpacing: 1, color: colors.textMuted, marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.text, fontSize: 15,
  },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2,
  },
  chipActive:  { borderColor: 'rgba(34,197,94,0.4)', backgroundColor: colors.accentDim },
  chipText:    { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  chipTextActive: { color: colors.accent },
  personRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2,
  },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkboxMark: { color: colors.bg, fontSize: 13, fontWeight: '700' },
  personName:  { flex: 1, fontSize: 15, color: colors.text },
  personShare: { fontFamily: 'Courier', fontSize: 13, color: colors.textMuted },
  shareInput: {
    width: 80, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    color: colors.text, fontSize: 14, textAlign: 'right',
  },
  helper:      { fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: 4 },
  error:       { color: colors.danger, fontSize: 13, marginTop: 14 },
  submitBtn:   { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitText:  { color: '#0d0d0f', fontSize: 15, fontWeight: '700' },
});
