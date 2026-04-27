import { db, auth } from '../firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit as _limit, addDoc, serverTimestamp, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

const COLLECTION = 'milestones';

const MilestonesService = {
  getMilestones: async (vtuberId = null) => {
    try {
      // if vtuberId not provided, use current authenticated user
      if (!vtuberId) {
        const user = auth.currentUser;
        if (!user) throw new Error('未登入，無法取得里程碑');
        vtuberId = user.uid;
      }

      const colRef = collection(db, COLLECTION);
      const qOwner = query(colRef, where('vtuberId', '==', vtuberId));
      const qCollab = query(colRef, where('collaborators', 'array-contains', vtuberId));
      
      const [ownerResult, collabResult] = await Promise.allSettled([getDocs(qOwner), getDocs(qCollab)]);
      const snapOwner = ownerResult.status === 'fulfilled' ? ownerResult.value : { docs: [] };
      const snapCollab = collabResult.status === 'fulfilled' ? collabResult.value : { docs: [] };
      if (ownerResult.status === 'rejected') {
        console.warn('[MilestonesService] owner milestones query failed:', ownerResult.reason);
      }
      if (collabResult.status === 'rejected') {
        console.warn('[MilestonesService] collaborator milestones query failed:', collabResult.reason);
      }
      const map = new Map();
      snapOwner.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
      snapCollab.docs.forEach(d => {
        if (!map.has(d.id)) { map.set(d.id, { id: d.id, ...d.data() }); }
      });
      
      const result = Array.from(map.values());
      // sort by createdAt desc if available
      result.sort((a, b) => {
        const tA = (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
        const tB = (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
        return tB - tA;
      });
      return result;
    } catch (err) {
      console.error('[MilestonesService] getMilestones error:', err);
      throw err;
    }
  },

  getRankings: async (milestoneId, lim = 5) => {
    try {
      const rankingsRef = collection(db, COLLECTION, milestoneId, 'rankings');
      const q = query(rankingsRef, orderBy('totalAmount', 'desc'), _limit(lim));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('[MilestonesService] getRankings error:', err);
      throw err;
    }
  },

  /**
   * 即時監聽里程碑進度（onSnapshot）
   * @param {string} vtuberId
   * @param {function} callback - (milestones[]) => void
   * @param {string[]} statuses - 要監聽的狀態，預設公開狀態
   * @returns unsubscribe function
   */
  listenPublicMilestones: (vtuberId, callback, statuses = ['published', 'active', 'achieved']) => {
    const q = query(
      collection(db, COLLECTION),
      where('vtuberId', '==', vtuberId),
      where('status', 'in', statuses)
    );
    return onSnapshot(q, (snap) => {
      const milestones = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      milestones.sort((a, b) => {
        const tA = a.publishedAt?.toMillis ? a.publishedAt.toMillis() : 0;
        const tB = b.publishedAt?.toMillis ? b.publishedAt.toMillis() : 0;
        return tB - tA;
      });
      callback(milestones);
    }, (err) => {
      console.warn('[MilestonesService] listenPublicMilestones error:', err);
    });
  },

  /**
   * 即時監聽排行榜（依 transactions 集合彙整粉絲累積金額）
   * @param {string} milestoneId
   * @param {number} lim - 前幾名
   * @param {function} callback - (rankList[]) => void，每項 { fanUid, displayName, totalAmount }
   * @returns unsubscribe function
   */
  listenRankings: (milestoneId, lim = 10, callback) => {
    const q = query(
      collection(db, 'transactions'),
      where('milestoneId', '==', milestoneId),
      where('status', '==', 'success')
    );
    return onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach(d => {
        const tx = d.data();
        if (!map[tx.fanUid]) {
          map[tx.fanUid] = { fanUid: tx.fanUid, displayName: tx.fanName || '匿名', totalAmount: 0 };
        }
        map[tx.fanUid].totalAmount += (Number(tx.amount) || 0);
      });
      const sorted = Object.values(map)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, lim);
        
      let myAmount = 0;
      const user = auth.currentUser;
      if (user && map[user.uid]) {
        myAmount = map[user.uid].totalAmount;
      }
      callback(sorted, myAmount);
    }, (err) => {
      console.warn('[MilestonesService] listenRankings error:', err);
      callback([], 0);
    });
  }


  , getPublicMilestones: async (vtuberId = null) => {
    try {
      // if vtuberId not provided, use current authenticated user
      if (!vtuberId) {
        const user = auth.currentUser;
        if (!user) throw new Error('未指定 vtuberId，且目前未登入');
        vtuberId = user.uid;
      }

      // If the current user is the owner, return full list (including drafts)
      const user = auth.currentUser;
      if (user && user.uid === vtuberId) {
        return await MilestonesService.getMilestones(vtuberId);
      }

      // Public viewers only see published/active/achieved/archived statuses.
      // Include status constraint in Firestore query so rules can authorize list reads.
      const colRef = collection(db, COLLECTION);
      const publicStatuses = ['published', 'active', 'achieved', 'archived'];
      const qOwner = query(
        colRef,
        where('vtuberId', '==', vtuberId),
        where('status', 'in', publicStatuses)
      );
      
      try {
        const snapOwner = await getDocs(qOwner);
        const result = [];
        
        snapOwner.docs.forEach(d => {
          const data = d.data();
          // Handle missing status field (treat as draft, which is not public)
          const status = data.status || 'draft';
          if (publicStatuses.includes(status)) {
            result.push({ id: d.id, ...data, status });
          }
        });

        // sort by publishedAt explicitly
        result.sort((a, b) => {
          const tA = (a.publishedAt?.toMillis ? a.publishedAt.toMillis() : 0);
          const tB = (b.publishedAt?.toMillis ? b.publishedAt.toMillis() : 0);
          return tB - tA;
        });
        console.log('[MilestonesService] getPublicMilestones returning', result.length, 'milestones for vtuberId=', vtuberId);
        return result;
      } catch (queryErr) {
        console.error('[MilestonesService] query error:', queryErr);
        // Return empty array if query fails (e.g., no documents match)
        return [];
      }
    } catch (err) {
      console.error('[MilestonesService] getPublicMilestones error:', err);
      throw err;
    }
  }

  , createDraft: async (milestone) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('未登入，無法建立里程碑草稿');

      // Normalize fields: store canonical `targetAmount` instead of `goal`
      const targetAmount = Number(milestone.goal || milestone.targetAmount || milestone.target || 0) || 0;
      const payload = Object.assign({}, milestone);
      // remove non-canonical fields
      delete payload.goal;
      delete payload.target;
      payload.targetAmount = targetAmount;
      payload.vtuberId = user.uid;
      payload.status = milestone.status || 'draft';
      payload.currentAmount = 0;
      payload.totalSupporters = 0;
      payload.createdAt = serverTimestamp();

      const docRef = await addDoc(collection(db, COLLECTION), payload);

      return { id: docRef.id };
    } catch (err) {
      console.error('[MilestonesService] createDraft error:', err);
      throw err;
    }
  }
  , update: async (milestoneId, milestone) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('未登入，無法更新里程碑');
      const ref = doc(db, COLLECTION, milestoneId);
      // Normalize goal -> targetAmount on updates, and avoid sending legacy keys
      const payload = Object.assign({}, milestone);
      const targetAmount = Number(payload.goal || payload.targetAmount || payload.target || 0) || 0;
      delete payload.goal;
      delete payload.target;
      payload.targetAmount = targetAmount;
      // Only update provided fields; server-controlled fields are protected by rules
      await updateDoc(ref, {
        ...payload,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (err) {
      console.error('[MilestonesService] update error:', err);
      throw err;
    }
  }
  , publish: async (milestoneId) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('未登入，無法發布');
      const ref = doc(db, COLLECTION, milestoneId);
      await updateDoc(ref, {
        status: 'published',
        publishedAt: serverTimestamp()
      });
      return true;
    } catch (err) {
      console.error('[MilestonesService] publish error:', err);
      throw err;
    }
  }
  , delete: async (milestoneId) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('未登入，無法刪除里程碑');
      const ref = doc(db, COLLECTION, milestoneId);
      // Hard-delete: remove document immediately
      await deleteDoc(ref);
      return true;
    } catch (err) {
      console.error('[MilestonesService] delete error:', err);
      throw err;
    }
  }
};

// Expose global for legacy code
window.MilestonesService = MilestonesService;

export default MilestonesService;
