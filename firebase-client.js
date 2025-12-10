// firebase-client.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

let auth = null;
let provider = null;

export async function initialize() {
  if (auth) return;
  try {
    const res = await fetch('/__/firebase/init.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('no hosted firebase config');
    const cfg = await res.json();
    initializeApp(cfg);
  } catch (err) {
    console.warn('Could not load /__/firebase/init.json — ensure Firebase config is provided.', err);
    throw new Error('Firebase config not found. Provide /__/firebase/init.json or inline config in firebase-client.js');
  }
  auth = getAuth();
  provider = new GoogleAuthProvider();
}

export async function signInWithGoogle() {
  if (!auth || !provider) throw new Error('firebase not initialized');
  return signInWithPopup(auth, provider);
}

export async function signInWithEmail(email, password) {
  if (!auth) throw new Error('firebase not initialized');
  return signInWithEmailAndPassword(auth, email, password);
}

export async function createAccountWithEmail(email, password) {
  if (!auth) throw new Error('firebase not initialized');
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function resetPassword(email) {
  if (!auth) throw new Error('firebase not initialized');
  return sendPasswordResetEmail(auth, email);
}

export async function logout() {
  if (!auth) throw new Error('firebase not initialized');
  return signOut(auth);
}

export function onAuthStateChanged(cb) {
  if (!auth) throw new Error('firebase not initialized');
  return firebaseOnAuthStateChanged(auth, cb);
}
