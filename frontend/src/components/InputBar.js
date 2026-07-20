import React, { useState, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity, Text,
  StyleSheet, Animated,
} from 'react-native';
import { colors } from '../theme';
import { parse, MAX_AMOUNT } from '../utils/parser';

export default function InputBar({ onAdd }) {
  const [text, setText] = useState('');
  const [warning, setWarning] = useState(null);
  const warnAnim = useRef(new Animated.Value(0)).current;

  function showWarning(title, sub) {
    setWarning({ title, sub });
    Animated.sequence([
      Animated.timing(warnAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.delay(3500),
      Animated.timing(warnAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start(() => setWarning(null));
  }

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;

    const parts = trimmed.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    const ok = [], bad = [];
    let anyTooLarge = false;
    parts.forEach(p => {
      const r = parse(p);
      if (r && r.tooLarge) { anyTooLarge = true; bad.push(p); }
      else if (r) ok.push(r);
      else bad.push(p);
    });

    if (ok.length === 0) {
      if (anyTooLarge) {
        showWarning('Amount too large', `Max amount is ${MAX_AMOUNT.toLocaleString()}`);
      } else {
        showWarning('Amount not recognized', 'Try "lunch 45" or "coffee 12+5"');
      }
      return;
    }

    ok.forEach(p => onAdd(p));
    setText('');

    if (bad.length > 0) {
      showWarning(`${bad.length} item${bad.length > 1 ? 's' : ''} not recognized`, bad.join(', '));
    }
  }

  return (
    <View style={styles.area}>
      {warning && (
        <Animated.View style={[styles.warning, { opacity: warnAnim }]}>
          <Text style={styles.warnTitle}>{warning.title}</Text>
          {warning.sub ? <Text style={styles.warnSub}>{warning.sub}</Text> : null}
        </Animated.View>
      )}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="spent 20 on food…"
          placeholderTextColor={colors.textDim}
          multiline
          maxLength={300}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim()}
          activeOpacity={0.75}
        >
          <Text style={[styles.sendIcon, !text.trim() && styles.sendIconDisabled]}>▶</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    paddingBottom: 12,
    backgroundColor: colors.bg,
  },
  warning: {
    backgroundColor: 'rgba(244,63,94,0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  warnTitle: { color: 'rgba(244,63,94,0.9)', fontSize: 13, fontWeight: '600' },
  warnSub:   { color: 'rgba(244,63,94,0.6)', fontSize: 11, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    paddingVertical: 10,
    paddingLeft: 18,
    paddingRight: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    maxHeight: 100,
    lineHeight: 22,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.surface2 },
  sendIcon:        { color: colors.bg, fontSize: 14 },
  sendIconDisabled:{ color: colors.textDim },
});
