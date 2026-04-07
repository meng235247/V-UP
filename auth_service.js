import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from './firebase_config.js';
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * V-UP Identity & Access Management (IAM)
 */

export const authService = {
    // 1. Google Login Flow (Authentication only)
    loginWithGoogle: async (mode = 'login') => {
        try {
            console.log(`📡 Initiating Google SSO (Mode: ${mode})...`);
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (mode === 'register' && !userSnap.exists()) {
                return { user, needsSetup: true };
            } else if (userSnap.exists()) {
                const userData = userSnap.data();
                authService.redirectByRole(userData.role);
                return { user, needsSetup: false };
            } else {
                // User doesn't exist but is in login mode
                throw new Error("此 Google 帳號尚未註冊，請先切換至「註冊」分頁。");
            }
        } catch (error) {
            console.error("❌ Google Auth Error:", error);
            throw error;
        }
    },

    // 1.1 Email Registration
    registerWithEmail: async (email, password) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            return { user: result.user, needsSetup: true };
        } catch (error) {
            console.error("❌ Email Register Error:", error);
            throw error;
        }
    },

    // 1.2 Email Login
    loginWithEmail: async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            const userRef = doc(db, "users", result.user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                return { user: result.user, needsSetup: true };
            }
            
            const userData = userSnap.data();
            authService.redirectByRole(userData.role);
            return { user: result.user, needsSetup: false };
        } catch (error) {
            console.error("❌ Email Login Error:", error);
            throw error;
        }
    },

    // 2. Finalize Registration (Identity Setup)
    completeSetup: async (uid, userData) => {
        try {
            console.log("📝 Finalizing Identity Setup for:", uid);
            const userRef = doc(db, "users", uid);
            
            // 1. Force Local Pre-sync (Instant UI feedback)
            localStorage.setItem('vup_user_profile', JSON.stringify(userData));

            // 2. Save to Firestore
            await setDoc(userRef, {
                ...userData,
                createdAt: serverTimestamp()
            });

            if (userData.role === 'vtuber') {
                await setDoc(doc(db, "stats", uid), {
                    points: 0, fans: 0, views: 0,
                    milestones_total: 0,
                    trends: {
                        points: [0,0,0,0,0,0,0], fans: [0,0,0,0,0,0,0],
                        dates: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
                    },
                    lastUpdated: serverTimestamp()
                });
            }

            console.log("✅ Setup Complete! Redirecting in 1s...");
            // Small delay to ensure DB propagation
            setTimeout(() => authService.redirectByRole(userData.role), 1000);
        } catch (error) {
            console.error("❌ Setup Error:", error);
            throw error;
        }
    },

    // 3. Role-based Redirection
    redirectByRole: (role) => {
        const target = (role === 'vtuber' || role === 'admin') ? 'dashboard.html' : 'fan_profile.html';
        window.location.href = target;
    },

    // 4. Auth Guard for Protected Pages
    guardPage: (requiredRole = null) => {
        // 先強制隱藏整個頁面，避免在檢查權限的 0.5 秒內發生「畫面殘影」導致機密外洩
        if (document.body) document.body.style.display = 'none';

        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = 'auth.html';
                return;
            }
            
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                console.warn("⚠️ User authenticated but no profile found. Redirecting to setup...");
                window.location.href = 'auth.html?mode=register';
                return;
            }
            
            const role = userSnap.data()?.role;
            if (requiredRole && role !== requiredRole && role !== 'admin') {
                alert("權限不足，將強制封鎖並引導回首頁");
                window.location.href = 'index.html';
            } else {
                // 權限核准，解除隱藏
                if (document.body) {
                    document.body.style.display = '';
                }
            }
        });
    },

    logout: async () => {
        await signOut(auth);
        window.location.href = 'index.html?logout=true';
    }
};

// --- Identity Helpers ---
window.selectPresetAvatar = (url) => {
    const preview = document.getElementById('setup-avatar-preview');
    const input = document.getElementById('setup-avatar-url');
    if (preview) preview.src = url;
    if (input) input.value = url;
    
    document.querySelectorAll('.preset-opt').forEach(opt => {
        opt.style.border = opt.src === url ? '3px solid var(--vt-pink-dark)' : '3px solid transparent';
    });
};
