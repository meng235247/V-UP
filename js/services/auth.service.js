import { auth, db } from '../firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut,
    onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

class AuthService {
    constructor() {
        this.googleProvider = new GoogleAuthProvider();
    }

    // Monitor auth state changes
    onAuthChange(callback) {
        return onAuthStateChanged(auth, callback);
    }

    // Get current user details from Firestore
    async getUserProfile(uid) {
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            throw error;
        }
    }

    // Internal helper to create user doc if missing
    async _ensureUserDocument(user, role, displayName) {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        
        if (!docSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                role: role,
                displayName: displayName || user.displayName || user.email.split('@')[0],
                // photoURL: 使用者上傳頭像；初始值從 Google 帳號取得（若無則 null）
                photoURL: user.photoURL || null,
                createdAt: serverTimestamp()
            });
        } else {
            // 若 Google 頭貼更新但 Firestore doc 裡尚無 photoURL，補寫一次
            const existing = docSnap.data();
            if (!existing.photoURL && user.photoURL) {
                const { updateDoc } = await import('firebase/firestore');
                await updateDoc(userRef, { photoURL: user.photoURL });
            }
        }
    }

    // Email/Password Registration
    async registerWithEmail(email, password, displayName, role) {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            await this._ensureUserDocument(result.user, role, displayName);
            return result.user;
        } catch (error) {
            console.error("Registration failed:", error);
            throw error;
        }
    }

    // Email/Password Login
    async loginWithEmail(email, password) {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return result.user;
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    }

    // Google Sign-In
    async loginWithGoogle(role) {
        try {
            const result = await signInWithPopup(auth, this.googleProvider);
            // Default Google login to requested role or 'fan' if not specified
            await this._ensureUserDocument(result.user, role || 'fan', null);
            return result.user;
        } catch (error) {
            console.error("Google Login failed:", error);
            throw error;
        }
    }

    // Logout
    async logout() {
        try {
            await signOut(auth);
            return true;
        } catch (error) {
            console.error("Logout failed:", error);
            throw error;
        }
    }
}

export const authService = new AuthService();
