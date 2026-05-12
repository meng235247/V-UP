import { db, auth } from '../firebase-config.js';
import {
  collection, doc, query, where, getDocs, orderBy,
  runTransaction, serverTimestamp, updateDoc, arrayUnion, setDoc
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
  initiate: async (milestoneId, amount, method, message, customName = null) => {
    const user = auth.currentUser;
    if (!user) throw new Error('請先登入');
    if (!milestoneId) throw new Error('缺少里程碑 ID');
    if (!(Number(amount) > 0)) throw new Error('贊助金額必須大於 0');

    const milestoneRef = doc(db, 'milestones', milestoneId);
    // 預先建立 txRef，讓 txId 在 transaction 外也能取用
    const txRef = doc(collection(db, 'transactions'));

    let vtuberId = '';
    let milestoneTitle = '';

    // --- 原子操作：同時更新里程碑進度 + 建立交易紀錄 + 更新使用者資料 ---
    await runTransaction(db, async (t) => {
      const msSnap = await t.get(milestoneRef);
      if (!msSnap.exists()) throw new Error('里程碑不存在');

      // 從 users 集合讀取最新的資料
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await t.get(userDocRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      
      const baseDisplayName = userData.displayName || (user.displayName || '匿名粉絲');
      // customName 優先（用戶在 modal 自填），否則用帳號名
      const fanDisplayName = (customName && customName.trim()) ? customName.trim() : baseDisplayName;
      const fanAvatarUrl = userData.photoURL || user.photoURL || null;
      const unlockedMilestones = userData.unlockedMilestones || [];
      const isFirstTime = !unlockedMilestones.includes(milestoneId);

      const msData = msSnap.data();
      vtuberId = msData.vtuberId || '';
      milestoneTitle = msData.title || '';

      const prevAmount = typeof msData.currentAmount === 'number' ? msData.currentAmount : 0;
      const prevSupporters = typeof msData.totalSupporters === 'number' ? msData.totalSupporters : 0;

      // 1. 更新里程碑累積金額與支持者數
      const newAmount = prevAmount + Number(amount);
      const newSupporters = prevSupporters + 1;

      // ── Compute whether this payment tips the milestone over the goal ──
      const targetCandidates = [
        { key: 'targetAmount', value: msData.targetAmount },
        { key: 'goal', value: msData.goal },
        { key: 'target', value: msData.target }
      ];
      let targetAmt = 0;
      let targetKey = null;
      for (const c of targetCandidates) {
        const raw = c.value;
        const num = (typeof raw === 'number') ? raw : (typeof raw === 'string' ? Number(raw) : NaN);
        if (Number.isFinite(num) && num > 0) {
          targetAmt = num;
          targetKey = c.key;
          break;
        }
      }
      const prevStatus = msData.status || 'published';
      const willAchieve = targetAmt > 0 && newAmount >= targetAmt
        && prevStatus !== 'achieved' && prevStatus !== 'archived' && prevStatus !== 'cancelled';
      if (willAchieve && targetKey !== 'targetAmount') {
        console.warn('[PaymentService] Using legacy target field for auto-achieve:', { targetKey, targetAmt, milestoneId });
      }

      // 1. 更新里程碑累積金額與支持者數（若達標則同時寫入 achieved 狀態）
      const milestoneUpdate = {
        currentAmount: newAmount,
        totalSupporters: newSupporters,
        updatedAt: serverTimestamp()
      };
      if (willAchieve) {
        milestoneUpdate.status = 'achieved';
        milestoneUpdate.achievedAt = serverTimestamp();
      }
      t.update(milestoneRef, milestoneUpdate);

      // 2. 建立交易紀錄
      t.set(txRef, {
        fanUid: user.uid,
        fanName: fanDisplayName,
        fanAvatarUrl,
        vtuberId,
        milestoneId,
        milestoneTitle,
        amount: Number(amount),
        method: method || 'simulated',
        message: message || '',
        status: 'success',
        createdAt: serverTimestamp()
      });

      // 3. 更新粉絲個人資料（僅在第一次贊助此里程碑時發放徽章）
      const userUpdates = {
        unlockedMilestones: arrayUnion(milestoneId),
        supportedVtubers: arrayUnion(vtuberId),
        updatedAt: serverTimestamp()
      };

      if (isFirstTime) {
        const newBadge = {
          milestoneId,
          name: milestoneTitle || '贊助者',
          icon: '🏅',
          badgeUrl: msData.badgeUrl || '',
          awardedAt: new Date().toISOString()
        };
        userUpdates.badges = arrayUnion(newBadge);
        console.log('[PaymentService] First time sponsor! Awarding badge with URL:', msData.badgeUrl);
      }

      t.set(userDocRef, userUpdates, { merge: true });

      // 暫存達標結果供 transaction 外使用
      PaymentService._justAchieved = willAchieve;
    });

    const justAchieved = !!PaymentService._justAchieved;
    PaymentService._justAchieved = null;
    if (justAchieved) console.log('[PaymentService] Milestone auto-achieved:', milestoneId);

    console.log('[PaymentService] initiate success', { txId: txRef.id, milestoneId, amount, justAchieved });
    return { txId: txRef.id, status: 'success', justAchieved };
  },


  /**
   * Guest initiate: allow unauthenticated users to create a transaction.
   * This writes a transaction with `status: 'success'` for now (no real payment gateway).
   * Does NOT mutate user or milestone documents.
   */
  initiateGuest: async (vtuberId, milestoneId, amount, method, message, guestName) => {
    if (!(Number(amount) > 0)) throw new Error('贊助金額必須大於 0');
    if (!milestoneId) throw new Error('缺少 milestoneId');

    const txRef = doc(collection(db, 'transactions'));

    // Guest payload: omit fanUid to simplify rules check
    const payload = {
      fanName: guestName || '匿名粉絲',
      vtuberId: vtuberId || null,
      milestoneId: milestoneId,
      amount: Number(amount),
      method: method || 'guest_ui',
      message: message || '',
      status: 'success',
      createdAt: serverTimestamp()
    };

    try {
      // Simple client-side write for guest; keep it minimal and auditable
      await setDoc(txRef, payload);
      console.log('[PaymentService] initiateGuest created', txRef.id, payload);
      return { txId: txRef.id, status: 'success' };
    } catch (err) {
      console.error('[PaymentService] initiateGuest error', err);
      throw err;
    }
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
