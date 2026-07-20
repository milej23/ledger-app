import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  ScrollView, StyleSheet, Alert,
} from 'react-native';
import { colors } from '../theme';

// Members are tracked as { key, type: 'existing'|'new', id?, name } so newly
// typed names can be turned into real people (via addPerson) only once the
// group is actually submitted, rather than polluting the contact list early.
export default function AddGroupModal({ visible, people, onClose, onSubmit, addPerson, removePerson }) {
  const [name, setName] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [members, setMembers] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setNewPersonName('');
      setMembers([]);
      setError(null);
      setSubmitting(false);
    }
  }, [visible]);

  const availablePeople = people.filter(p => !members.some(m => m.type === 'existing' && m.id === p.id));

  function addExistingMember(p) {
    setMembers(prev => [...prev, { key: `e-${p.id}`, type: 'existing', id: p.id, name: p.name }]);
  }

  function addNewMember() {
    const trimmed = newPersonName.trim();
    if (!trimmed) return;
    setMembers(prev => [...prev, { key: `n-${Date.now()}-${prev.length}`, type: 'new', name: trimmed }]);
    setNewPersonName('');
  }

  function removeMember(key) {
    setMembers(prev => prev.filter(m => m.key !== key));
  }

  // Permanently deletes a past contact from the suggestion list (with the
  // same cascade as deleting them from a group screen).
  function confirmDeletePerson(p) {
    Alert.alert(
      `Delete ${p.name}?`,
      'They are removed from every group, expenses they paid for are deleted, and their shares elsewhere are removed. Groups left with fewer than 2 people are deleted too.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removePerson(p.id) },
      ]
    );
  }

  async function handleSubmit() {
    const trimmedName = name.trim();
    setError(null);
    if (!trimmedName) return setError('Enter a group name');
    if (members.length < 2) return setError('Add at least 2 people');

    setSubmitting(true);
    try {
      const memberIds = [];
      for (const m of members) {
        if (m.type === 'existing') {
          memberIds.push(m.id);
        } else {
          const created = await addPerson(m.name);
          memberIds.push(created.id);
        }
      }
      onSubmit(trimmedName, memberIds);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create group</Text>

          <Text style={styles.label}>Group name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Roommates, Japan trip…"
            placeholderTextColor={colors.textDim}
          />

          <Text style={styles.label}>Add people</Text>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, styles.addInput]}
              value={newPersonName}
              onChangeText={setNewPersonName}
              placeholder="Type a name…"
              placeholderTextColor={colors.textDim}
              onSubmitEditing={addNewMember}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={addNewMember}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {availablePeople.length > 0 && (
            <>
              <Text style={styles.helper}>Or pick someone you've split with before</Text>
              <View style={styles.chipRow}>
                {availablePeople.map(p => (
                  <View key={p.id} style={styles.suggestChip}>
                    <TouchableOpacity onPress={() => addExistingMember(p)} hitSlop={4}>
                      <Text style={styles.suggestChipText}>+ {p.name}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDeletePerson(p)} hitSlop={8}>
                      <Text style={styles.suggestChipRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}

          {members.length > 0 && (
            <>
              <Text style={styles.label}>Members ({members.length})</Text>
              <View style={styles.chipRow}>
                {members.map(m => (
                  <View key={m.key} style={styles.memberChip}>
                    <Text style={styles.memberChipText}>{m.name}</Text>
                    <TouchableOpacity onPress={() => removeMember(m.key)} hitSlop={6}>
                      <Text style={styles.memberChipRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitText}>{submitting ? 'Creating…' : 'Create group'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '85%' },
  sheetHandle: { width: 34, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  title:       { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  label:       { fontSize: 12, fontWeight: '600', letterSpacing: 1, color: colors.textMuted, marginTop: 16, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.text, fontSize: 15,
  },
  addRow:      { flexDirection: 'row', gap: 8 },
  addInput:    { flex: 1 },
  addBtn:      { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  addBtnText:  { color: colors.text, fontSize: 14, fontWeight: '600' },
  helper:      { fontSize: 12, color: colors.textMuted, marginTop: 14, marginBottom: 8 },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2 },
  suggestChipText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  suggestChipRemove: { fontSize: 12, color: colors.textDim },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)', backgroundColor: colors.accentDim,
  },
  memberChipText:   { fontSize: 13, color: colors.accent, fontWeight: '600' },
  memberChipRemove: { fontSize: 12, color: colors.accent },
  error:       { color: colors.danger, fontSize: 13, marginTop: 14 },
  submitBtn:   { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitBtnDisabled: { opacity: 0.6 },
  submitText:  { color: '#0d0d0f', fontSize: 15, fontWeight: '700' },
});
