import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import {
  getSplitPeople, createSplitPerson, deleteSplitPerson,
  getSplitExpenses, createSplitExpense, updateSplitExpense, deleteSplitExpense,
  getSplitGroups, createSplitGroup, deleteSplitGroup,
} from '../api';
import { auth } from '../firebase';

const PEOPLE_KEY   = 'split_people_cache';
const EXPENSES_KEY = 'split_expenses_cache';
const GROUPS_KEY   = 'split_groups_cache';

const CACHE_KEYS = { people: PEOPLE_KEY, expenses: EXPENSES_KEY, groups: GROUPS_KEY };

let idCounter = 0;
function makeId(suffix) {
  idCounter = (idCounter + 1) % 1_000_000;
  return `${Date.now()}-${idCounter}-${suffix}`;
}

// ── Shared store ─────────────────────────────────────────
// One in-memory state shared by every screen that calls useSplit(). Each
// screen used to load its own private copy, so a group created on the Split
// screen could look missing ("This group no longer exists") when its detail
// screen mounted and loaded from a not-yet-written cache or an unreachable
// server. With a single store, an optimistic update made anywhere is
// immediately visible everywhere.
let store = { people: [], expenses: [], groups: [], loading: true };
const listeners = new Set();
let hydrated = false; // true after the first load; gates cache writes
let watching = false;

function emit(patch) {
  store = { ...store, ...patch };
  // Mirror every change to the cache (once hydrated) so offline restarts and
  // network-failure fallbacks always see the latest state.
  if (hydrated) {
    for (const key of Object.keys(patch)) {
      if (CACHE_KEYS[key]) {
        AsyncStorage.setItem(CACHE_KEYS[key], JSON.stringify(store[key])).catch(() => {});
      }
    }
  }
  listeners.forEach(fn => fn());
}

async function readCache() {
  const [p, e, g] = await Promise.all([
    AsyncStorage.getItem(PEOPLE_KEY),
    AsyncStorage.getItem(EXPENSES_KEY),
    AsyncStorage.getItem(GROUPS_KEY),
  ]);
  return {
    people:   p ? JSON.parse(p) : [],
    expenses: e ? JSON.parse(e) : [],
    groups:   g ? JSON.parse(g) : [],
  };
}

// Falls back to the AsyncStorage cache when offline / not logged in.
async function load() {
  try {
    if (auth.currentUser) {
      const [p, e, g] = await Promise.all([getSplitPeople(), getSplitExpenses(), getSplitGroups()]);
      hydrated = true;
      emit({ people: p, expenses: e, groups: g, loading: false });
    } else {
      const cached = await readCache();
      hydrated = true;
      emit({ ...cached, loading: false });
    }
  } catch {
    let cached = { people: [], expenses: [], groups: [] };
    try { cached = await readCache(); } catch {}
    hydrated = true;
    emit({ ...cached, loading: false });
  }
}

function ensureWatchers() {
  if (watching) return;
  watching = true;
  // Fires once Firebase resolves the persisted session (the initial load)
  // and again on every sign-in / sign-out (same pattern as useTransactions).
  onAuthStateChanged(auth, load);
  AppState.addEventListener('change', (s) => { if (s === 'active') load(); });
}

async function addPerson(name) {
  const newPerson = { id: makeId('p'), name };
  emit({ people: [...store.people, newPerson] }); // optimistic
  try {
    if (auth.currentUser) {
      const saved = await createSplitPerson(newPerson);
      emit({ people: store.people.map(p => p.id === newPerson.id ? saved : p) });
    }
  } catch {
    // Keep the optimistic entry; it's already persisted to the cache
  }
  return newPerson;
}

async function removePerson(id) {
  // Mirror the backend cascade locally: drop expenses they paid for, strip
  // their shares from everything else, and remove them from any groups.
  // A group left with fewer than 2 members can't split anything anymore,
  // so it is deleted too (its remaining expenses are just un-tagged).
  const keptGroups = [];
  const droppedGroupIds = new Set();
  for (const g of store.groups) {
    const memberIds = g.memberIds.filter(m => m !== id);
    if (memberIds.length >= 2) keptGroups.push({ ...g, memberIds });
    else droppedGroupIds.add(g.id);
  }
  emit({
    people: store.people.filter(p => p.id !== id),
    expenses: store.expenses
      .filter(e => e.paidBy !== id)
      .map(e => ({ ...e, shares: e.shares.filter(s => s.personId !== id) }))
      .map(e => droppedGroupIds.has(e.groupId) ? { ...e, groupId: null } : e),
    groups: keptGroups,
  });
  try {
    if (auth.currentUser) await deleteSplitPerson(id);
  } catch {}
}

async function addExpense(expense) {
  const newExpense = { id: makeId('exp'), ts: Date.now(), groupId: null, ...expense };
  emit({ expenses: [newExpense, ...store.expenses] }); // optimistic
  try {
    if (auth.currentUser) {
      const saved = await createSplitExpense(newExpense);
      emit({ expenses: store.expenses.map(e => e.id === newExpense.id ? saved : e) });
    }
  } catch {
    // Keep the optimistic entry; it's already persisted to the cache
  }
}

async function updateExpense(id, patch) {
  emit({ expenses: store.expenses.map(e => e.id === id ? { ...e, ...patch, id } : e) });
  try {
    if (auth.currentUser) {
      const saved = await updateSplitExpense(id, patch);
      emit({ expenses: store.expenses.map(e => e.id === id ? saved : e) });
    }
  } catch {
    // Keep the optimistic edit; it's already persisted to the cache
  }
}

async function removeExpense(id) {
  emit({ expenses: store.expenses.filter(e => e.id !== id) });
  try {
    if (auth.currentUser) await deleteSplitExpense(id);
  } catch {}
}

async function addGroup(name, memberIds) {
  const newGroup = { id: makeId('grp'), name, memberIds };
  emit({ groups: [...store.groups, newGroup] }); // optimistic
  try {
    if (auth.currentUser) {
      const saved = await createSplitGroup(newGroup);
      emit({ groups: store.groups.map(g => g.id === newGroup.id ? saved : g) });
    }
  } catch {
    // Keep the optimistic entry; it's already persisted to the cache
  }
  return newGroup;
}

async function removeGroup(id) {
  // Un-tag the group's expenses rather than deleting them (mirrors the
  // backend's ON DELETE SET NULL on split_expenses.group_id).
  emit({
    groups: store.groups.filter(g => g.id !== id),
    expenses: store.expenses.map(e => e.groupId === id ? { ...e, groupId: null } : e),
  });
  try {
    if (auth.currentUser) await deleteSplitGroup(id);
  } catch {}
}

function subscribe(cb) {
  ensureWatchers();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSplit() {
  // useSyncExternalStore subscribes during render (no gap where an emit could
  // be missed) and re-renders whenever `store` is replaced by emit().
  const snap = useSyncExternalStore(subscribe, () => store);

  return {
    people: snap.people,
    expenses: snap.expenses,
    groups: snap.groups,
    loading: snap.loading,
    addPerson, removePerson,
    addExpense, updateExpense, removeExpense,
    addGroup, removeGroup,
    reload: load,
  };
}
