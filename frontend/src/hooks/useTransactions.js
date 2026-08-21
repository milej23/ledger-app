import { useSyncExternalStore } from 'react';
import { AppState, NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { getTransactions, createTransaction, deleteTransaction, clearTransactions } from '../api';
import { auth } from '../firebase';
import { parse } from '../utils/parser';

const STORAGE_KEY = 'ledger_tx_cache';

// Date.now() alone can collide when multiple transactions are created in the
// same millisecond (e.g. pasting "lunch 45, coffee 5"), which would violate
// the server's primary key on `id`. The counter guarantees uniqueness.
let idCounter = 0;
function makeId() {
  idCounter = (idCounter + 1) % 1_000_000;
  return `${Date.now()}-${idCounter}-tx`;
}

// ── Shared store ─────────────────────────────────────────
// One in-memory state shared by every screen that calls useTransactions().
// Each screen used to load its own private copy, so a spend added on the
// Calendar screen didn't appear on Home, and data could look missing on a
// freshly mounted screen before its own load finished.
let store = { transactions: [], loading: true };
const listeners = new Set();
let hydrated = false; // true after the first load; gates cache writes
let watching = false;

function emit(patch) {
  store = { ...store, ...patch };
  // Mirror every change to the cache (once hydrated) so offline restarts and
  // network-failure fallbacks always see the latest state.
  if (hydrated && 'transactions' in patch) {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store.transactions)).catch(() => {});
  }
  listeners.forEach(fn => fn());
}

async function readCache() {
  const cached = await AsyncStorage.getItem(STORAGE_KEY);
  return cached ? JSON.parse(cached) : [];
}

// Falls back to the AsyncStorage cache when offline / not logged in.
async function load() {
  try {
    if (auth.currentUser) {
      const data = await getTransactions();
      hydrated = true;
      emit({ transactions: data, loading: false });
    } else {
      const cached = await readCache();
      hydrated = true;
      emit({ transactions: cached, loading: false });
    }
  } catch {
    let cached = [];
    try { cached = await readCache(); } catch {}
    hydrated = true;
    emit({ transactions: cached, loading: false });
  }
}

// Entries typed into the home-screen widget while the app was closed are
// queued natively (see PendingStore.kt); pull them in, parse, and save.
// Runs after load() so the server refresh can't overwrite the new entries.
async function drainWidgetQueue() {
  if (Platform.OS !== 'android' || !NativeModules.WidgetQueue) return;
  try {
    const items = await NativeModules.WidgetQueue.drain();
    for (const text of items || []) {
      const parsed = parse(text);
      if (parsed && !parsed.tooLarge) {
        await addTransaction({
          amount: parsed.amount,
          cat: parsed.cat,
          desc: parsed.desc,
          isIncome: parsed.isIncome,
        });
      }
    }
  } catch {}
}

function ensureWatchers() {
  if (watching) return;
  watching = true;
  // Fires once Firebase resolves the persisted session (the initial load —
  // auth.currentUser is often still null at mount time) and again on every
  // sign-in / sign-out.
  onAuthStateChanged(auth, async () => { await load(); drainWidgetQueue(); });
  // Refresh when the app returns to the foreground, so data doesn't go
  // stale after being backgrounded.
  AppState.addEventListener('change', async (s) => {
    if (s === 'active') { await load(); drainWidgetQueue(); }
  });
}

async function addTransaction(tx) {
  const newTx = { id: makeId(), ts: Date.now(), ...tx };
  emit({ transactions: [newTx, ...store.transactions] }); // optimistic
  try {
    if (auth.currentUser) {
      // Send the full record (with the collision-proof client id and ts) —
      // the server's own fallback id can collide when several transactions
      // are posted in the same millisecond.
      const saved = await createTransaction(newTx);
      emit({ transactions: store.transactions.map(t => t.id === newTx.id ? saved : t) });
    }
  } catch {
    // Keep the optimistic entry; it's already persisted to the cache
  }
}

async function removeTransaction(id) {
  emit({ transactions: store.transactions.filter(t => t.id !== id) });
  try {
    if (auth.currentUser) await deleteTransaction(id);
  } catch {}
}

async function clearAll() {
  emit({ transactions: [] });
  // Always clear the local cache even if the server call fails, so a
  // network error can't leave stale data to reappear on the next load.
  await Promise.allSettled([
    AsyncStorage.removeItem(STORAGE_KEY),
    auth.currentUser ? clearTransactions() : Promise.resolve(),
  ]);
}

function subscribe(cb) {
  ensureWatchers();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useTransactions() {
  // useSyncExternalStore subscribes during render (no gap where an emit could
  // be missed) and re-renders whenever `store` is replaced by emit().
  const snap = useSyncExternalStore(subscribe, () => store);

  return {
    transactions: snap.transactions,
    loading: snap.loading,
    addTransaction,
    removeTransaction,
    clearAll,
    reload: load,
  };
}
