import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// V-Up! Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsXfdzWtmzYJRs_CkaMBbSLEMNy_GEupg",
  authDomain: "v-up-b407d.firebaseapp.com",
  projectId: "v-up-b407d",
  storageBucket: "v-up-b407d.firebasestorage.app",
  messagingSenderId: "1072759671746",
  appId: "1:1072759671746:web:109be9a82e6b313eeca45b",
  measurementId: "G-FQLP9M5TWH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export instances
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword };

console.log("🚀 V-Up! Firebase & Auth Initialized");
