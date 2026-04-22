import { db } from '../firebase-config.js';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const COLLECTION = 'vtubers';
const HANDLES_COLLECTION = 'handles';

class VtuberService {

    /**
     * 從 Firestore 讀取創作者公開頁面資料
     * @param {string} uid - Firebase Auth UID
     */
    async getProfile(uid) {
        try {
            const ref = doc(db, COLLECTION, uid);
            const snap = await getDoc(ref);
            return snap.exists() ? snap.data() : null;
        } catch (err) {
            console.error('[VtuberService] getProfile error:', err);
            throw err;
        }
    }

    /**
     * 儲存創作者公開頁面資料到 Firestore
     * @param {string} uid - Firebase Auth UID
     * @param {object} data - 頁面資料
     */
    async saveProfile(uid, data) {
        try {
            const ref = doc(db, COLLECTION, uid);
            
            // 檢查是否需要刪除舊 Handle
            let oldHandle = null;
            if (data.handle !== undefined) {
                const oldSnap = await getDoc(ref);
                if (oldSnap.exists()) {
                    oldHandle = oldSnap.data().handle;
                }
            }

            await setDoc(ref, {
                ...data,
                updatedAt: serverTimestamp()
            }, { merge: true });

            // 同步寫入 handle 反查索引
            if (data.handle) {
                const handleRef = doc(db, HANDLES_COLLECTION, data.handle);
                await setDoc(handleRef, { uid }, { merge: true });
            }
            
            // 刪除已經廢棄的舊 handle 索引
            if (oldHandle && oldHandle !== data.handle) {
                await deleteDoc(doc(db, HANDLES_COLLECTION, oldHandle));
            }
        } catch (err) {
            console.error('[VtuberService] saveProfile error:', err);
            throw err;
        }
    }

    /**
     * 透過 handle 反查 uid 再取得 profile
     * @param {string} handle - 例如 'sakuranova'
     */
    async getProfileByHandle(handle) {
        try {
            if (!handle) return null;

            // First try the handles reverse-index (preferred)
            const handleRef = doc(db, HANDLES_COLLECTION, handle);
            const handleSnap = await getDoc(handleRef);
            if (handleSnap.exists()) {
                const { uid } = handleSnap.data();
                const profile = await this.getProfile(uid);
                // Ensure uid is included in returned profile
                if (profile) {
                    return { ...profile, uid };
                }
                return null;
            }

            // Fallback: if the handles index is missing or the caller passed a raw uid,
            // try to read the profile document directly by id.
            const profileRef = doc(db, COLLECTION, handle);
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
                return { ...profileSnap.data(), uid: handle };
            }

            return null;
        } catch (err) {
            console.error('[VtuberService] getProfileByHandle error:', err);
            throw err;
        }
    }
}

export const vtuberService = new VtuberService();
