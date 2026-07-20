import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { colors } from '../theme';
import { useSplit } from '../hooks/useSplit';
import { computeBalances, suggestSettlements } from '../utils/split';
import AddExpenseModal from '../components/AddExpenseModal';

export default function SplitGroupScreen({ navigation, route }) {
  const { groupId } = route.params;
  const { people, expenses, groups, loading, addExpense, updateExpense, removeExpense, removeGroup, removePerson } = useSplit();
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const sym = route.params?.currency?.symbol || '$';
  const group = groups.find(g => g.id === groupId);
  const members = useMemo(
    () => (group ? people.filter(p => group.memberIds.includes(p.id)) : []),
    [people, group]
  );
  const groupExpenses = useMemo(
    () => expenses.filter(e => e.groupId === groupId).sort((a, b) => b.ts - a.ts),
    [expenses, groupId]
  );
  const balances = useMemo(() => computeBalances(members, groupExpenses), [members, groupExpenses]);
  const settlements = useMemo(() => suggestSettlements(balances), [balances]);

  function personName_(id) {
    return people.find(p => p.id === id)?.name || 'Deleted person';
  }

  function handleDeleteExpense(id) {
    Alert.alert('Delete expense?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeExpense(id) },
    ]);
  }

  function handleSubmitExpense(payload) {
    if (editingExpense) {
      updateExpense(editingExpense.id, { ...payload, groupId });
      setEditingExpense(null);
    } else {
      addExpense({ ...payload, groupId });
      setShowAddExpense(false);
    }
  }

  function handleDeletePerson(person) {
    Alert.alert(
      `Delete ${person.name}?`,
      'They are removed from every group, expenses they paid for are deleted, and their shares elsewhere are removed. Groups left with fewer than 2 people are deleted too.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removePerson(person.id) },
      ]
    );
  }

  function handleDeleteGroup() {
    Alert.alert(
      `Delete "${group?.name}"?`,
      'Its expenses stay in your history but will no longer be grouped.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { removeGroup(groupId); navigation.goBack(); } },
      ]
    );
  }

  if (!loading && !group) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.iconBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Group</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>This group no longer exists</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.iconBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{group?.name}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleDeleteGroup}>
          <Text style={styles.iconBtnText}>🗑</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ flex: 1 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MEMBERS</Text>
            {members.map(p => {
              const net = balances[p.id] || 0;
              const isZero = Math.abs(net) < 0.005;
              return (
                <View key={p.id} style={styles.personRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{p.name}</Text>
                    <Text style={styles.personSub}>
                      {isZero ? 'settled up' : net > 0 ? 'is owed in this group' : 'owes in this group'}
                    </Text>
                  </View>
                  <Text style={[
                    styles.balance,
                    isZero ? styles.balanceZero : net > 0 ? styles.balancePositive : styles.balanceNegative,
                  ]}>
                    {isZero ? '' : net > 0 ? '+' : '-'}{sym}{Math.abs(net).toFixed(2)}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeletePerson(p)} hitSlop={8}>
                    <Text style={styles.del}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {groupExpenses.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>WHO OWES WHOM</Text>
              {settlements.length === 0 ? (
                <Text style={styles.noData}>Everyone is settled up 🎉</Text>
              ) : (
                settlements.map((t, i) => (
                  <View key={i} style={styles.settleRow}>
                    <Text style={styles.settleText}>
                      <Text style={styles.settleName}>{personName_(t.from)}</Text>
                      {'  pays  '}
                      <Text style={styles.settleName}>{personName_(t.to)}</Text>
                    </Text>
                    <Text style={styles.settleAmount}>{sym}{t.amount.toFixed(2)}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>EXPENSES</Text>
            {groupExpenses.length === 0 ? (
              <Text style={styles.noData}>No expenses in this group yet</Text>
            ) : (
              groupExpenses.map(exp => (
                <TouchableOpacity key={exp.id} style={styles.expenseRow} onPress={() => setEditingExpense(exp)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.expenseDesc} numberOfLines={1}>{exp.description}</Text>
                    <Text style={styles.expenseSub}>
                      {personName_(exp.paidBy)} paid · {new Date(exp.ts).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.expenseAmount}>{sym}{Number(exp.amount).toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => handleDeleteExpense(exp.id)} hitSlop={8}>
                    <Text style={styles.del}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.addExpenseBtn} onPress={() => setShowAddExpense(true)}>
          <Text style={styles.addExpenseText}>+ Add expense</Text>
        </TouchableOpacity>
      </View>

      <AddExpenseModal
        visible={showAddExpense || !!editingExpense}
        people={members}
        initialExpense={editingExpense}
        onClose={() => { setShowAddExpense(false); setEditingExpense(null); }}
        onSubmit={handleSubmitExpense}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 20, paddingBottom: 10 },
  iconBtn:     { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: colors.text, fontSize: 22, fontWeight: '600' },
  title:       { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.text },
  section:     { paddingTop: 8, paddingBottom: 4 },
  sectionLabel:{ fontSize: 12, fontWeight: '600', letterSpacing: 1.5, color: colors.textMuted, paddingHorizontal: 20, paddingBottom: 8 },
  personRow: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:  { color: colors.text, fontSize: 16, fontWeight: '700' },
  personName:  { fontSize: 15, fontWeight: '500', color: colors.text },
  personSub:   { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  balance:     { fontFamily: 'Courier', fontSize: 15, fontWeight: '600' },
  balancePositive: { color: colors.accent },
  balanceNegative: { color: colors.danger },
  balanceZero: { color: colors.textDim },
  settleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  settleText:   { fontSize: 14, color: colors.textMuted },
  settleName:   { color: colors.text, fontWeight: '600' },
  settleAmount: { fontFamily: 'Courier', fontSize: 14, fontWeight: '600', color: colors.accent },
  expenseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  expenseDesc: { fontSize: 14, fontWeight: '500', color: colors.text },
  expenseSub:  { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  expenseAmount: { fontFamily: 'Courier', fontSize: 14, color: colors.text },
  del:         { color: colors.textDim, fontSize: 13, padding: 3 },
  noData:      { textAlign: 'center', padding: 20, fontSize: 13, color: colors.textDim },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 80 },
  emptyTitle:  { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  footer:      { padding: 16 },
  addExpenseBtn: { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  addExpenseText: { color: '#0d0d0f', fontSize: 15, fontWeight: '700' },
});
