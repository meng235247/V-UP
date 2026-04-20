// VTubers service (modular Firestore) — keeps backwards global `VtubersService` usage
const { db } = require("D:\\code\\vup\\V-UP\\tmp-test\\mocks\\firebase-config.js");
const { doc, getDoc, collection, getDocs, query, where, orderBy, limit: _limit, setDoc, deleteDoc, serverTimestamp } = require("D:\\code\\vup\\V-UP\\tmp-test\\mocks\\firestore-mock.js");

const COLLECTION = 'vtuber_profiles';

const VtubersService = {
  getVtuber: async (id) => {
    try {
      const ref = doc(db, COLLECTION, id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('VTuber not found');
      return { id: snap.id, ...snap.data() };
    } catch (err) {
      console.error('[VtubersService] getVtuber error:', err);
      throw err;
    }
  },

  listVtubers: async () => {
    try {
      const colRef = collection(db, COLLECTION);
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('[VtubersService] listVtubers error:', err);
      throw err;
    }
  }
};

// Expose as global for existing non-module pages
window.VtubersService = VtubersService;

module.exports = VtubersService;;
