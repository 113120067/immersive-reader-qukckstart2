import { initialize } from './firebase-client.js';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

let db = null;

async function ensureDb() {
  if (db) return db;
  const { app, auth } = await initialize();
  db = getFirestore(app);
  return db;
}

export async function createNote(title = '', content = '') {
  const db = await ensureDb();
  const { auth } = await initialize();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const notesCol = collection(db, 'notes');
  const docRef = await addDoc(notesCol, {
    owner: user.uid,
    title,
    content,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getNote(id) {
  const db = await ensureDb();
  const d = await getDoc(doc(db, 'notes', id));
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() };
}

export async function updateNote(id, { title, content }) {
  const db = await ensureDb();
  const { auth } = await initialize();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const noteRef = doc(db, 'notes', id);
  await updateDoc(noteRef, {
    title,
    content,
    updatedAt: serverTimestamp(),
  });
  return true;
}

export async function deleteNote(id) {
  const db = await ensureDb();
  const { auth } = await initialize();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const noteRef = doc(db, 'notes', id);
  await deleteDoc(noteRef);
  return true;
}

export async function onUserNotesChanged(callback) {
  const db = await ensureDb();
  const { auth } = await initialize();
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const notesCol = collection(db, 'notes');
  const q = query(notesCol, where('owner', '==', user.uid), orderBy('updatedAt', 'desc'));
  const unsubscribe = onSnapshot(q, snapshot => {
    const notes = [];
    snapshot.forEach(doc => notes.push({ id: doc.id, ...doc.data() }));
    callback(notes);
  }, err => {
    console.error('notes onSnapshot error', err);
  });

  return unsubscribe;
}
