// ─────────────────────────────────────────────────────────
//  API client — talks to your Node.js backend
//  Change BASE_URL to your backend's address once deployed.
// ─────────────────────────────────────────────────────────
import axios from 'axios';
import { auth } from './firebase';

const BASE_URL = 'https://ledger-o5w5.onrender.com';

const api = axios.create({ baseURL: BASE_URL });

// Attach the Firebase ID token to every request automatically
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Transactions ───────────────────────────────────────
export const getTransactions = () =>
  api.get('/transactions').then(r => r.data);

export const createTransaction = (tx) =>
  api.post('/transactions', tx).then(r => r.data);

export const deleteTransaction = (id) =>
  api.delete(`/transactions/${id}`).then(r => r.data);

export const clearTransactions = () =>
  api.delete('/transactions').then(r => r.data);

// ── Split (Splitwise-style expense sharing) ────────────
export const getSplitPeople = () =>
  api.get('/split/people').then(r => r.data);

export const createSplitPerson = (person) =>
  api.post('/split/people', person).then(r => r.data);

export const deleteSplitPerson = (id) =>
  api.delete(`/split/people/${id}`).then(r => r.data);

export const getSplitExpenses = () =>
  api.get('/split/expenses').then(r => r.data);

export const createSplitExpense = (expense) =>
  api.post('/split/expenses', expense).then(r => r.data);

export const updateSplitExpense = (id, expense) =>
  api.put(`/split/expenses/${id}`, expense).then(r => r.data);

export const deleteSplitExpense = (id) =>
  api.delete(`/split/expenses/${id}`).then(r => r.data);

export const getSplitGroups = () =>
  api.get('/split/groups').then(r => r.data);

export const createSplitGroup = (group) =>
  api.post('/split/groups', group).then(r => r.data);

export const deleteSplitGroup = (id) =>
  api.delete(`/split/groups/${id}`).then(r => r.data);
