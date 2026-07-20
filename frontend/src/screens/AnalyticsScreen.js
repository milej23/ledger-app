import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../theme';
import { getCatLabel, getCatColor, getCatIcon, CATEGORIES } from '../utils/categories';
import { useTransactions } from '../hooks/useTransactions';

function PieChart({ data, symbol }) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  if (total === 0) return <Text style={styles.noData}>No expense data</Text>;

  const SIZE = 180;
  const R = 70;
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  let startAngle = -Math.PI / 2;
  const slices = data.map(d => {
    const angle = (d.amount / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    startAngle += angle;
    const x2 = cx + R * Math.cos(startAngle);
    const y2 = cy + R * Math.sin(startAngle);
    const large = angle > Math.PI ? 1 : 0;
    // A slice covering (nearly) the full pie has coincident endpoints, which
    // the SVG arc command draws as nothing — render it as a circle instead.
    const full = angle >= 2 * Math.PI * 0.999;
    return { ...d, full, path: `M${cx},${cy} L${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} Z` };
  });

  return (
    <View style={styles.pieWrap}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {slices.map((s, i) => s.full
            ? <Circle key={i} cx={cx} cy={cy} r={R} fill={s.color} />
            : <Path key={i} d={s.path} fill={s.color} />)}
          <Circle cx={cx} cy={cy} r={45} fill={colors.surface} />
        </Svg>
        <View style={styles.pieCenter}>
          <Text style={styles.pieCenterTotal}>{symbol}{total.toFixed(2)}</Text>
          <Text style={styles.pieCenterSub}>total spent</Text>
        </View>
      </View>

      <View style={styles.legend}>
        {data.map((d, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
            <Text style={styles.legendName}>{d.label}</Text>
            <Text style={styles.legendPct}>{((d.amount / total) * 100).toFixed(0)}%</Text>
            <Text style={styles.legendAmt}>{symbol}{d.amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function AnalyticsScreen({ route, navigation }) {
  const { currency = { symbol: '$' } } = route.params || {};
  const { transactions, clearAll } = useTransactions();
  const sym = currency.symbol;

  const catData = useMemo(() => {
    const map = {};
    transactions.filter(t => !t.isIncome).forEach(t => {
      if (!map[t.cat]) map[t.cat] = 0;
      map[t.cat] += t.amount;
    });
    return Object.entries(map)
      .map(([cat, amount]) => ({ cat, amount, label: getCatLabel(cat), color: getCatColor(cat), icon: getCatIcon(cat) }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  function handleClear() {
    Alert.alert('Clear all transactions?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearAll },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Analytics</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Category breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BREAKDOWN</Text>
          {catData.length === 0 ? (
            <Text style={styles.noData}>No transactions yet</Text>
          ) : catData.map((d, i) => (
            <View key={i} style={styles.catRow}>
              <Text style={styles.catIcon}>{d.icon}</Text>
              <Text style={styles.catName}>{d.label}</Text>
              <Text style={styles.catAmt}>{sym}{d.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Pie chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SPENDING BY CATEGORY</Text>
          <PieChart data={catData} symbol={sym} />
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Text style={styles.clearBtnText}>Clear all transactions</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: colors.bg },
  nav:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 34, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn:     { paddingHorizontal: 8, paddingVertical: 6 },
  backText:    { color: colors.accent, fontSize: 16, fontWeight: '500' },
  title:       { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text, marginRight: 60 },
  section:     { padding: 16, paddingBottom: 20 },
  sectionTitle:{ fontSize: 11, fontWeight: '600', letterSpacing: 1, color: colors.textMuted, marginBottom: 16, textTransform: 'uppercase' },
  catRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  catIcon:     { fontSize: 20 },
  catName:     { flex: 1, fontSize: 15, fontWeight: '500', color: colors.text },
  catAmt:      { fontFamily: 'Courier', fontSize: 15, fontWeight: '500', color: colors.text },
  divider:     { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
  pieWrap:     { alignItems: 'center', gap: 20 },
  pieCenter:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  pieCenterTotal: { fontFamily: 'Courier', fontSize: 18, fontWeight: '600', color: colors.text },
  pieCenterSub:   { fontSize: 10, color: colors.textDim, marginTop: 2 },
  legend:      { width: '100%', gap: 8 },
  legendRow:   { flexDirection: 'row', alignItems: 'center', gap: 9 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendName:  { flex: 1, fontSize: 13, color: colors.textMuted },
  legendPct:   { fontFamily: 'Courier', fontSize: 11, color: colors.textDim, width: 34, textAlign: 'right' },
  legendAmt:   { fontFamily: 'Courier', fontSize: 13, fontWeight: '500', color: colors.text },
  noData:      { textAlign: 'center', padding: 30, fontSize: 13, color: colors.textDim },
  clearBtn:    { margin: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(244,63,94,0.25)', borderRadius: 14, alignItems: 'center' },
  clearBtnText:{ color: colors.danger, fontSize: 14, fontWeight: '600' },
});
