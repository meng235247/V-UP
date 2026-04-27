import { db, auth } from '../firebase-config.js';
import {
  collection, doc, query, where, getDocs, orderBy,
  runTransaction, serverTimestamp, updateDoc, arrayUnion
} from 'firebase/firestore';

const PaymentService = {
  /**
   * 模擬贊助流程（寫入 Firestore）
   * 使用 runTransaction 確保里程碑進度與交易紀錄同時寫入（原子操作）。
   * 交易完成後，為粉絲更新 unlockedMilestones、supportedVtubers 與 badges。
   *
   * @param {string} milestoneId - 里程碑 document ID
   * @param {number} amount - 贊助金額
   * @param {string} method - 付款方式（模擬用）
   * @param {string} message - 粉絲留言
   * @returns {{ txId: string, status: 'success' }}
   */
  initiate: async (milestoneId, amount, method, message) => {
    const user = auth.currentUser;
    if (!user) throw new Error('請先登入');
    if (!milestoneId) throw new Error('缺少里程碑 ID');
    if (!(Number(amount) > 0)) throw new Error('贊助金額必須大於 0');

    const milestoneRef = doc(db, 'milestones', milestoneId);
    // 預先建立 txRef，讓 txId 在 transaction 外也能取用
    const txRef = doc(collection(db, 'transactions'));

    let vtuberId = '';
    let milestoneTitle = '';

    // --- 原子操作：同時更新里程碑進度 + 建立交易紀錄 ---
    await runTransaction(db, async (t) => {
      const msSnap = await t.get(milestoneRef);
      if (!msSnap.exists()) throw new Error('里程碑不存在');

      // [修正] 從 users 集合讀取最新的 displayName，而非僅依賴 auth.currentUser
      const userSnap = await t.get(doc(db, 'users', user.uid));
      const fanDisplayName = userSnap.exists() ? userSnap.data().displayName : (user.displayName || '匿名粉絲');

      const msData = msSnap.data();
      vtuberId = msData.vtuberId || '';
      milestoneTitle = msData.title || '';

      const prevAmount = typeof msData.currentAmount === 'number' ? msData.currentAmount : 0;
      const prevSupporters = typeof msData.totalSupporters === 'number' ? msData.totalSupporters : 0;

      // 更新里程碑累積金額與支持者數
      t.update(milestoneRef, {
        currentAmount: prevAmount + Number(amount),
        totalSupporters: prevSupporters + 1,
        updatedAt: serverTimestamp()
      });

      // 建立交易紀錄（直接以 status:'success' 寫入，因為這是模擬流程）
      t.set(txRef, {
        fanUid: user.uid,
        fanName: fanDisplayName,
        vtuberId,
        milestoneId,
        milestoneTitle,
        amount: Number(amount),
        method: method || 'simulated',
        message: message || '',
        status: 'success',        // 模擬：直接成功，不走 pending→success 兩段式
        createdAt: serverTimestamp()
      });
    });

    // --- 原子操作外：更新粉絲個人資料 ---
    // （user doc 的更新不在 transaction 內，因為 rules 允許粉絲自己 update）
    const newBadge = {
      milestoneId,
      name: milestoneTitle || '贊助者',
      icon: '🏅',
      awardedAt: new Date().toISOString()
    };

    await updateDoc(doc(db, 'users', user.uid), {
      unlockedMilestones: arrayUnion(milestoneId),
      supportedVtubers: arrayUnion(vtuberId),
      badges: arrayUnion(newBadge),
      updatedAt: serverTimestamp()
    });

    console.log('[PaymentService] initiate success', { txId: txRef.id, milestoneId, amount });
    return { txId: txRef.id, status: 'success' };
  },

  /**
   * 查詢單筆交易狀態（目前為 Firestore 直讀，保留供未來擴充）
   */
  getStatus: async (txId) => {
    try {
      const { getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'transactions', txId));
      if (!snap.exists()) return { txId, status: 'not_found' };
      return { txId, status: snap.data().status };
    } catch (err) {
      console.error('[PaymentService] getStatus error:', err);
      return { txId, status: 'error' };
    }
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
