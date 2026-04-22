import { db, auth } from '../firebase-config.js';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const PaymentService = {
  initiate: (milestoneId, amount, method, message) => {
    // Placeholder for initiating a payment
    console.log('[Payment Initiated]', { milestoneId, amount, method, message });
    return Promise.resolve({ txId: 'mockTxId123', status: 'pending' });
  },

  getStatus: (txId) => {
    // Placeholder for checking payment status
    console.log('[Get Payment Status]', { txId });
    return Promise.resolve({ txId, status: 'success' });
  },

  getTransactions: async (vtuberId) => {
    try {
      const colRef = collection(db, 'transactions');
      const q = query(colRef, where('vtuberId', '==', vtuberId), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error('[PaymentService] getTransactions error:', err);
      // Fallback or empty if indexes are missing initially
      if (err.message && err.message.includes('index')) {
         console.warn('Missing composite index, falling back to memory sort');
         const fallbackQ = query(collection(db, 'transactions'), where('vtuberId', '==', vtuberId));
         const fallbackSnap = await getDocs(fallbackQ);
         const docs = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() }));
         docs.sort((a,b) => {
             const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
             const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
             return tB - tA;
         });
         return docs;
      }
      throw err;
    }
  },

  exportToCSV: (dataList, filename = 'export.csv') => {
    if (!dataList || !dataList.length) {
      alert('無資料可匯出');
      return;
    }

    // Extract headers from first item (excluding possible complex nested objects, keep it simple)
    const headers = ['fanName', 'milestoneTitle', 'amount', 'status', 'createdAt', 'fanMessage'];
    const rows = [];
    
    // Add header row
    rows.push(headers.join(','));

    // Map object to row
    dataList.forEach(item => {
      const row = [
        `"${(item.fanName || item.fanUid || '隱藏名字').replace(/"/g, '""')}"`,
        `"${(item.milestoneTitle || item.milestoneId || '無里程碑').replace(/"/g, '""')}"`,
        item.amount || 0,
        `"${(item.status || '不明').replace(/"/g, '""')}"`,
        item.createdAt?.toDate ? `"${item.createdAt.toDate().toLocaleString()}"` : '""',
        `"${(item.message || '').replace(/"/g, '""')}"`
      ];
      rows.push(row.join(','));
    });

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
    const blob = new Blob([bom, rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

window.PaymentService = PaymentService;
export default PaymentService;
