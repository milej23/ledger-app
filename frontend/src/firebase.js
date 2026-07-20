// ─────────────────────────────────────────────────────────
//  Firebase configuration
//  Replace every value below with your own project's config.
//  Get it from: Firebase Console → Project Settings → Your apps
// ─────────────────────────────────────────────────────────
import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            'AIzaSyDGafSgWso1alluVII5c2UjOTwb8gX8gGM',
  authDomain:        'ledger-b24f2.firebaseapp.com',
  projectId:         'ledger-b24f2',
  storageBucket:     'ledger-b24f2.firebasestorage.app',
  messagingSenderId: '508178103078',
  appId:             '1:508178103078:web:240c6b3be847c229101fe7',
};

const app = initializeApp(firebaseConfig);

// On native, getAuth() falls back to in-memory persistence, which signs the
// user out every time the app restarts — initializeAuth with AsyncStorage
// keeps the session. The web build uses the browser's own persistence.
export const auth = Platform.OS === 'web'
  ? getAuth(app)
  : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
