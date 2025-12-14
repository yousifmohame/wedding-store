// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// !! استبدل هذا الكائن بكائن الإعدادات الخاص بمشروعك من وحدة تحكم Firebase !!
const firebaseConfig = {
  apiKey: "AIzaSyDql3_48VoGk83vToIkRrVDcolGkwRG2Xc",
  authDomain: "zakerbackend.firebaseapp.com",
  projectId: "zakerbackend",
  storageBucket: "zakerbackend.appspot.com",
  messagingSenderId: "51750430624",
  appId: "1:51750430624:web:758a205658f5d75a0526c5",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// تهيئة الخدمات التي ستحتاجها
const firestore = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, firestore as db, auth, storage };
