// VTubers service placeholder
const VtubersService = {
  getVtuber: async (id) => {
    const vtuberRef = firebase.firestore().collection('vtubers').doc(id);
    const doc = await vtuberRef.get();
    if (!doc.exists) throw new Error('VTuber not found');
    return { id: doc.id, ...doc.data() };
  },

  listVtubers: async () => {
    const vtubersRef = firebase.firestore().collection('vtubers');
    const snapshot = await vtubersRef.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};
