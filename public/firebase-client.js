import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged as _onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as _signOut
  , signInWithEmailAndPassword, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let app = null;
let auth = null;
let initialized = false;

export async function initialize() {
  if (initialized) return { app, auth };

  const res = await fetch('/config/config', { cache: 'no-store' });
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Failed to load firebase config from /config/config: ${errorText}`);
  }
  const firebaseConfig = await res.json();
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  initialized = true;
  return { app, auth };
}

export function onAuthStateChanged(cb) {
  if (!initialized) throw new Error('Firebase not initialized. Call await initialize() first.');
  return _onAuthStateChanged(auth, cb);
}

export async function signInWithGoogle() {
  await initialize();
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  return signInWithPopup(auth, provider);
}

export async function signInWithEmail(email, password) {
  await initialize();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function createUserWithEmail(email, password) {
  await initialize();
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  await initialize();
  return _signOut(auth);
}
