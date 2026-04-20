const { db } = require("D:\\code\\vup\\V-UP\\tmp-test\\mocks\\firebase-config.js");
const { doc, getDoc, collection, getDocs, query, where, orderBy, limit: _limit, setDoc, deleteDoc, serverTimestamp } = require("D:\\code\\vup\\V-UP\\tmp-test\\mocks\\firestore-mock.js");

const COLLECTION = 'milestones';

const MilestonesService = {
  getMilestones: async (vtuberId) => {
    try {
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
};

// Expose global for legacy code
window.MilestonesService = MilestonesService;

module.exports = MilestonesService;;
