import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { colors } from '../theme';
import { useSplit } from '../hooks/useSplit';
import AddExpenseModal from '../components/AddExpenseModal';
import AddGroupModal from '../components/AddGroupModal';

export default function SplitScreen({ navigation, route }) {
  const {
    people, expenses, groups, loading,
    addPerson, removePerson, updateExpense, removeExpense, addGroup,
  } = useSplit();
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const sym = route.params?.currency?.symbol || '$';

  function personName_(id) {
    return people.find(p => p.id === id)?.name || 'Deleted person';
  }

  function handleDeleteExpense(id) {
    Alert.alert('Delete expense?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeExpense(id) },
    ]);
  }

  function handleCreateGroup(name, memberIds) {
    addGroup(name, memberIds);
    setShowAddGroup(false);
  }

  // New expenses are only created from inside a group (SplitGroupScreen);
  // this screen's modal opens purely for editing an existing expense.
  function handleSubmitExpense(payload) {
    if (!editingExpense) return;
    // Keep the expense in its group — the modal's payload has no groupId,
    // and the server treats a missing groupId as "un-tag this expense".
    updateExpense(editingExpense.id, { ...payload, groupId: editingExpense.groupId || null });
    setEditingExpense(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.iconBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Split</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setShowAddGroup(true)}>
          <Text style={styles.iconBtnText}>＋</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ flex: 1 }} />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          {groups.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No groups yet</Text>
              <Text style={styles.emptySub}>Tap ＋ to create a group and add people to it</Text>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>GROUPS</Text>
              {groups.map(g => (
                <TouchableOpacity
                  key={g.id}
                  style={styles.personRow}
                  onPress={() => navigation.navigate('SplitGroup', { groupId: g.id, currency: route.params?.currency })}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{g.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{g.name}</Text>
                    <Text style={styles.personSub}>{g.memberIds.length} people</Text>
                  </View>
                  <Text style={styles.arrowText}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {expenses.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>EXPENSES</Text>
              {expenses.map(exp => (
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
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <AddExpenseModal
        visible={!!editingExpense}
        people={people}
        initialExpense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onSubmit={handleSubmitExpense}
      />

      <AddGroupModal
        visible={showAddGroup}
        people={people}
        addPerson={addPerson}
        removePerson={removePerson}
        onClose={() => setShowAddGroup(false)}
        onSubmit={handleCreateGroup}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 20, paddingBottom: 10 },
  iconBtn:     { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: colors.text, fontSize: 22, fontWeight: '600' },
  title:       { fontSize: 18, fontWeight: '700', color: colors.text },
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
  arrowText:   { fontSize: 22, color: 'rgba(255,255,255,0.3)' },
  expenseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  expenseDesc: { fontSize: 14, fontWeight: '500', color: colors.text },
  expenseSub:  { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  expenseAmount: { fontFamily: 'Courier', fontSize: 14, color: colors.text },
  del:         { color: colors.textDim, fontSize: 13, padding: 3 },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon:   { fontSize: 32, marginBottom: 4 },
  emptyTitle:  { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  emptySub:    { fontSize: 12, color: colors.textDim, textAlign: 'center' },
});
