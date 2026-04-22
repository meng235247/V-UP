import { db, auth } from '../firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit as _limit, addDoc, serverTimestamp, updateDoc, deleteDoc, doc } from 'firebase/firestore';

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
      const q = query(colRef, where('vtuberId', '==', vtuberId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

      // Public viewers only see published/active/achieved/archived statuses
      const colRef = collection(db, COLLECTION);
      const publicStatuses = ['published', 'active', 'achieved', 'archived'];
      const q = query(colRef, where('vtuberId', '==', vtuberId), where('status', 'in', publicStatuses), orderBy('publishedAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
