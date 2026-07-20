import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { getCatIcon, getCatLabel, getCatColor } from '../utils/categories';

export default function TransactionRow({ tx, onDelete, symbol }) {
  const time = new Date(tx.ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const amtStr = `${tx.isIncome ? '+' : ''}${symbol}${Math.abs(tx.amount).toFixed(2)}`;

  return (
    <View style={styles.row}>
      <View style={[styles.icon, tx.isIncome && styles.iconIncome]}>
        <Text style={styles.iconText}>{getCatIcon(tx.cat)}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.desc} numberOfLines={1}>{tx.desc}</Text>
        <View style={styles.meta}>
          <Text style={styles.cat}>{getCatLabel(tx.cat)}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, tx.isIncome && { color: colors.accent }]}>
          {amtStr}
        </Text>
        <TouchableOpacity onPress={() => onDelete(tx.id)} hitSlop={8}>
          <Text style={styles.del}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconIncome: { backgroundColor: colors.accentDim },
  iconText: { fontSize: 17 },
  body: { flex: 1 },
  desc: { fontSize: 15, fontWeight: '500', color: colors.text, letterSpacing: -0.1 },
  meta: { flexDirection: 'row', gap: 6, marginTop: 3 },
  cat:  { fontSize: 12, color: 'rgba(255,255,255,0.42)' },
  time: { fontSize: 12, color: 'rgba(255,255,255,0.32)', fontFamily: 'Courier' },
  right: { alignItems: 'flex-end', gap: 5 },
  amount: { fontFamily: 'Courier', fontSize: 15, fontWeight: '500', color: colors.text },
  del:   { color: colors.textDim, fontSize: 13, padding: 3 },
});
