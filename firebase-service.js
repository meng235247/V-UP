import { db, auth } from './firebase_config.js';
import { 
    doc, 
    getDoc, 
    collection, 
    getDocs, 
    onSnapshot, 
    query, 
    where, 
    orderBy,
    updateDoc,
    enableIndexedDbPersistence,
    addDoc,
    serverTimestamp,
    limit,
    setDoc,
    increment,
    enableMultiTabIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";




// Enable Offline Persistence for High-End SaaS feel
// Enable Multi-Tab Persistence for a professional, stable SaaS feel
enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn("Firestore persistence: 正在其他分頁運行 (已自動切換同步模式)");
    } else if (err.code == 'unimplemented') {
        console.warn("Firestore persistence: 瀏覽器不支援離線快取");
    }
});




/**
 * V-Up! Firebase Service
 * Replaces the old vupFetch with real-time Firebase data
 */

export const firebaseService = {
    // Current User Data (Real-time listener variant)
    listenToProfile: (callback, uid) => {
        return onSnapshot(doc(db, "users", uid), (snapshot) => {
            if (snapshot.exists()) callback(snapshot.data());
        });
    },

    // Get a specific user profile once
    getCurrentUser: async (uid) => {
        const snap = await getDoc(doc(db, "users", uid));
        return snap.exists() ? snap.data() : null;
    },

    // Global Stats (points, fans, views)
    listenToStats: (callback, uid) => {
        return onSnapshot(doc(db, "stats", uid), (snapshot) => {
            if (snapshot.exists()) callback(snapshot.data());
        });
    },


    // Badges (Sub-collection)
    getBadges: (callback, uid) => {
        return onSnapshot(collection(db, "users", uid, "badges"), (snapshot) => {
            const badges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(badges);
        });
    },

    // Titles (Sub-collection)
    getTitles: (callback, uid) => {
        return onSnapshot(collection(db, "users", uid, "titles"), (snapshot) => {
            const titles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(titles);
        });
    },

    // Milestones (Global)
    getMilestones: (callback) => {
        return onSnapshot(collection(db, "milestones"), (snapshot) => {
            const milestones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(milestones);
        });
    },

    // Listen to a Specific Milestone (Real-time)
    listenToMilestone: (id, callback) => {
        return onSnapshot(doc(db, "milestones", id), (snapshot) => {
            if (snapshot.exists()) callback({ id: snapshot.id, ...snapshot.data() });
        });
    },

    // Notifications (Filtered by receiverId)
    getNotifications: (callback, uid) => {
        const q = query(collection(db, "notifications"), where("receiverId", "==", uid), orderBy("timestamp", "desc"));
        return onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(notifs);
        });
    },

    // --- WRITE OPERATIONS: Actions & Sync ---

    // Add a New Milestone
    addMilestone: async (msData) => {
        // Use setDoc if id is provided, otherwise addDoc
        if (msData.id) {
            await setDoc(doc(db, "milestones", msData.id), {
                ...msData,
                timestamp: serverTimestamp()
            });
        } else {
            await addDoc(collection(db, "milestones"), {
                ...msData,
                timestamp: serverTimestamp()
            });
        }
    },

    // Update Creator Profile
    updateProfile: async (profileData, uid) => {
        const ref = doc(db, "users", uid);
        await updateDoc(ref, profileData);
    },

    // Update Overall Stats
    updateStats: async (statsData, uid) => {
        const ref = doc(db, "stats", uid);
        await updateDoc(ref, statsData);
    },

    // Add a Sponsorship (Donation)
    addSponsorship: async (milestoneId, userId, amount, message = "") => {
        const msRef = doc(db, "milestones", milestoneId);
        
        // 1. Log the transaction
        await addDoc(collection(db, "sponsorships"), {
            milestoneId,
            userId,
            amount,
            message,
            timestamp: serverTimestamp()
        });

        // 2. Atomic update to milestone current amount
        await updateDoc(msRef, {
            current: increment(amount),
            donors: firebaseService._MOCK_APPEND_DONOR(userId, amount) // Simulate donor list append
        });

        // 3. Update global stats (Atomic)
        await firebaseService.incrementStat('points', amount);
    },

    // Add a Post (NEW)
    addPost: async (content, uid) => {
        await addDoc(collection(db, "posts"), {
            creatorId: uid,
            content: content,
            timestamp: serverTimestamp()
        });
    },

    // Check if a user has sponsored a milestone
    hasUserSponsored: async (milestoneId, userId) => {
        const q = query(
            collection(db, "sponsorships"), 
            where("milestoneId", "==", milestoneId),
            where("userId", "==", userId),
            limit(1)
        );
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    },

    // Internal mock for donor list (In real app, use sub-collection)
    _MOCK_APPEND_DONOR: (userId, amount) => {
        // This is a placeholder since we are not fully refactoring the array to a sub-collection yet
        return []; 
    },

    // --- NEW: Identity Verification System ---
    submitVerificationRequest: async (uid, socialUrl, proofUrl) => {
        const ref = doc(db, "users", uid);
        await updateDoc(ref, {
            verificationStatus: 'pending',
            verificationSocial: socialUrl,
            verificationProof: proofUrl,
            verificationDate: serverTimestamp()
        });
        
        // Log the activity
        await firebaseService.addActivityLog('System', '已提交身分認證申請 (Pending Review)', uid);
    },

    // Optimization: Atomic Increments for Stats
    incrementStat: async (type, amount, uid) => {
        const ref = doc(db, "stats", uid);
        await updateDoc(ref, {
            [type]: increment(amount)
        });
    },

    // --- NEW: Posts & Photos Migration ---
    
    // Get Posts (Optional filtering by milestoneId)
    getPosts: (callback, milestoneId = null) => {
        let q;
        if (milestoneId) {
            q = query(
                collection(db, "posts"), 
                where("milestoneId", "==", milestoneId),
                orderBy("timestamp", "desc"), 
                limit(10)
            );
        } else {
            q = query(
                collection(db, "posts"), 
                orderBy("timestamp", "desc"), 
                limit(20)
            );
        }
        return onSnapshot(q, (snapshot) => {
            const posts = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                date: doc.data().timestamp?.toDate().toLocaleDateString() || "Just now" 
            }));
            callback(posts);
        });
    },


    // Add a New Post
    addPost: async (content, uid) => {
        await addDoc(collection(db, "posts"), {
            content,
            authorId: uid,
            timestamp: serverTimestamp()
        });
    },

    // Get Photos (Ordered by time)
    getPhotos: (callback) => {
        const q = query(collection(db, "photos"), orderBy("timestamp", "desc"), limit(30));
        return onSnapshot(q, (snapshot) => {
            const photos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(photos);
        });
    },

    // Add a New Photo
    addPhoto: async (url, title, uid) => {
        await addDoc(collection(db, "photos"), {
            url,
            title,
            authorId: uid,
            timestamp: serverTimestamp()
        });
    },

    // Activity Logs
    getActivityLogs: (callback) => {
        const q = query(collection(db, "activity_logs"), orderBy("timestamp", "desc"), limit(50));
        return onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                date: doc.data().timestamp?.toDate().toLocaleDateString() || "Today",
                time: doc.data().timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || "Just now"
            }));
            callback(logs);
        });
    },

    addActivityLog: async (category, message, uid) => {
        await addDoc(collection(db, "activity_logs"), {
            category,
            message,
            userId: uid,
            timestamp: serverTimestamp()
        });
    },

    // --- SEEDING: One-Click Initialization ---
    async seedDatabase() {
        const uid = "hoshino_yume"; // Correct ID for Dashboard matching
        
        console.log("🚀 Starting Firebase Seeding for hoshino_yume...");


        try {
            // 1. Initial Profile
            await setDoc(doc(db, "users", uid), {
                name: "SAKURA NOVA",
                handle: "@sakura_nova_live",
                catchphrase: "一起創造下個舞台",
                bio: "我是 Sakura Nova！為了能與各位更近距離地互動，現正朝著 3D 化目標前進。希望大家能支持我的夢想！🌸",
                style: "premium-sakura",
                color: "#FF6B9E",
                avatar: "image/miku_test.png",
                banner: "https://images.unsplash.com/photo-1522441815192-d9f04eb0615c?q=80&w=2000&auto=format&fit=crop",
                cms: {
                    h1: "V-Up! 綻放計畫",
                    sub: "陪他成長，做他最初的傳奇",
                    btn: "我要支持 VTuber",
                    marquee: "🌟 歡迎來到 V-Up! 綻放計畫！ 🌟 新任 VTuber「星野夢彩」出道紀念募資活動熱烈進行中！"
                }
            });
            console.log("-> Profile Seeded");

            // 2. Initial Stats with Historical Trends for Charts
            await setDoc(doc(db, "stats", uid), {
                points: 1250000,
                fans: 12840,
                views: 45200,
                milestones_total: 2,
                trends: {
                    points: [1100000, 1150000, 1180000, 1200000, 1220000, 1240000, 1250000],
                    fans: [11000, 11500, 12000, 12300, 12500, 12700, 12840],
                    dates: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
                }
            });
            console.log("-> Stats & Trends Seeded");


            // 3. Milestones
            const milestones = [
                {
                    id: "milestone_3d_stage",
                    title: "邁向全新 3D 舞台!!!",
                    desc: "達成此目標，我們將設計專屬的「櫻之星際」3D 場景，終於可以開大家許願很久的 3D LIVE 了。",
                    goal: 100000,
                    current: 85000,
                    status: "active",
                    type: "collab",
                    date: "2024.06",
                    donors: [
                        { name: "StarCollector_99", amount: 12500 },
                        { name: "Luv.Sakura", amount: 8800 },
                        { name: "MikuFan_01", amount: 5000 }
                    ]
                },
                {
                    id: "milestone_orig_song",
                    title: "挑戰! 全新原創曲製作",
                    desc: "達成此目標，我們將邀請頂尖製作人為 Sakura Nova 定制首支 3D 專屬單曲。",
                    goal: 200000,
                    current: 30000,
                    status: "active",
                    type: "individual",
                    date: "2024.08",
                    donors: []
                }
            ];
            for (const ms of milestones) {
                await setDoc(doc(db, "milestones", ms.id), ms);
            }
            console.log("-> Milestones Seeded");

            // 4. Sample Posts
            const posts = [
                {
                    title: "最新演唱會舞台設計草圖來啦!!",
                    content: "距離 3D 舞台達成更近了！這是我和設計師討論後的最新草圖概念，包含動態落櫻粒子和全息音效舞台 💖 目前已完成基礎場景構建，預計下個月開始全面製作！",
                    type: "image",
                    url: "https://picsum.photos/seed/stage/600/350",
                    mediaUrl: "https://picsum.photos/seed/stage/600/350",
                    milestoneId: "milestone_3d_stage",
                    authorId: uid,
                    timestamp: serverTimestamp()
                }
            ];
            for (const p of posts) {
                await addDoc(collection(db, "posts"), p);
            }
            console.log("-> Posts Seeded");

            // 5. Initial Log
            await addDoc(collection(db, "activity_logs"), {
                category: "系統",
                message: "🎉 雲端資料庫初始化完成！已同步前台預設數據。",
                userId: uid,
                timestamp: serverTimestamp()
            });

            console.log("✅ Seeding Complete!");
            return true;
        } catch (err) {
            console.error("❌ Seeding Error:", err);
            throw err;
        }

    }
};




