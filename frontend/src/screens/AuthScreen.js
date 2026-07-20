import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator,
} from 'react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../firebase';
import { colors } from '../theme';

// Firebase error codes → messages a person can act on. e.message is developer
// jargon like "Firebase: Error (auth/invalid-credential)".
const AUTH_ERRORS = {
  'auth/invalid-email':        'That email address doesn\'t look right.',
  'auth/user-not-found':       'No account found with that email.',
  'auth/wrong-password':       'Incorrect password.',
  'auth/invalid-credential':   'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with that email already exists. Try signing in.',
  'auth/weak-password':        'Password must be at least 6 characters.',
  'auth/too-many-requests':    'Too many attempts. Please wait a bit and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

export default function AuthScreen({ navigation }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin]   = useState(true);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit() {
    if (!email || !password) { Alert.alert('Please fill in all fields'); return; }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert(
        isLogin ? 'Couldn\'t sign in' : 'Couldn\'t create account',
        AUTH_ERRORS[e.code] || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.form}>
          <Text style={styles.heading}>{isLogin ? 'Sign in' : 'Create account'}</Text>
          <Text style={styles.sub}>Sync your transactions across devices</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textDim}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading
              ? <ActivityIndicator color={colors.bg} />
              : <Text style={styles.submitText}>{isLogin ? 'Sign in' : 'Sign up'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchBtn}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={{ color: colors.accent }}>{isLogin ? 'Sign up' : 'Sign in'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.bg },
  kav:        { flex: 1 },
  closeBtn:   { position: 'absolute', top: 16, right: 20, zIndex: 10, padding: 8 },
  closeText:  { color: colors.textMuted, fontSize: 18 },
  form:       { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  heading:    { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.8, marginBottom: 4 },
  sub:        { fontSize: 14, color: colors.textMuted, marginBottom: 12 },
  input:      { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 16 },
  submitBtn:  { backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#000', fontWeight: '700', fontSize: 16 },
  switchBtn:  { alignItems: 'center', marginTop: 8 },
  switchText: { color: colors.textMuted, fontSize: 14 },
});
