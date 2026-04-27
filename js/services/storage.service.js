import { storage } from '../firebase-config.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const UPLOAD_SERVER = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_UPLOAD_SERVER_URL) ? import.meta.env.VITE_UPLOAD_SERVER_URL : 'http://127.0.0.1:5176';
const USE_EMULATOR = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_USE_EMULATOR === 'true');

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/**
 * 上傳到本地開發伺服器 (僅限 Emulator 模式)
 */
async function uploadFileLocal(file) {
  const dataUrl = await fileToBase64(file);
  const base64 = dataUrl.split(',')[1] || dataUrl;
  const payload = { filename: file.name, contentType: file.type, data: base64 };
  const res = await fetch(`${UPLOAD_SERVER}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload failed: ${res.status} ${txt}`);
  }
  const json = await res.json();
  return json.url;
}

/**
 * 上傳到 Firebase Storage (線上環境)
 */
async function uploadFileFirebase(file) {
  // 建立唯一路徑：uploads/timestamp_filename
  const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
}

export const storageService = {
  uploadFile: async (file) => {
    // 根據環境變數決定使用哪種上傳方式
    if (USE_EMULATOR) {
      console.log('[StorageService] Using local upload server');
      return uploadFileLocal(file);
    } else {
      console.log('[StorageService] Using Firebase Storage');
      return uploadFileFirebase(file);
    }
  }
};
