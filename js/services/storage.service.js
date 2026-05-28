import { storage } from '../firebase-config.js';
import { auth } from '../firebase-config.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const UPLOAD_SERVER = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_UPLOAD_SERVER_URL) ? import.meta.env.VITE_UPLOAD_SERVER_URL : 'http://127.0.0.1:5176';
const USE_EMULATOR = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_USE_EMULATOR === 'true');
const VTUBER_BANNER_NAMES = ['banner.jpg', 'banner.jpeg', 'banner.png', 'banner.webp'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/mp3',
  'video/mp4'
]);
const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
]);

function normalizeMimeType(type) {
  return String(type || '').toLowerCase();
}

function assertValidFile(file, options = {}) {
  const { imagesOnly = false } = options;
  if (!file) throw new Error('未選擇檔案');
  const size = Number(file.size || 0);
  if (size <= 0) throw new Error('檔案內容為空');
  if (size > MAX_UPLOAD_BYTES) throw new Error('檔案大小不可超過 5MB');

  const type = normalizeMimeType(file.type);
  if (!type) throw new Error('無法辨識檔案格式');

  const allowedSet = imagesOnly ? IMAGE_MIME_TYPES : ALLOWED_MIME_TYPES;
  if (!allowedSet.has(type)) {
    if (imagesOnly) {
      throw new Error('僅支援圖片檔 (JPG/PNG/WEBP)');
    }
    throw new Error('僅支援 JPG/PNG/WEBP/MP3/MP4');
  }
}

function buildUploadMetadata(file) {
  const metadata = {
    cacheControl: 'public, max-age=3600'
  };
  if (file && file.type) metadata.contentType = file.type;
  return metadata;
}

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
 * 路徑：uploads/{uid}/timestamp_filename（需要登入才能上傳）
 */
async function uploadFileFirebase(file) {
  const user = auth.currentUser;
  if (!user) throw new Error('請先登入才能上傳檔案');
  // 用戶 UID 子目錄隔離，防止不同用戶互相覆蓋
  const storageRef = ref(storage, `uploads/${user.uid}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file, buildUploadMetadata(file));
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
}

function getFileExtension(filename = '') {
  const parts = String(filename).split('.');
  if (parts.length < 2) return '';
  return parts.pop().toLowerCase();
}

function normalizeImageExtension(ext = '') {
  const safe = ['jpg', 'jpeg', 'png', 'webp'];
  return safe.includes(ext) ? ext : 'jpg';
}

async function uploadFileFirebaseToPath(file, storagePath) {
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, file, buildUploadMetadata(file));
  return getDownloadURL(snapshot.ref);
}

async function uploadVtuberBanner(uid, file) {
  if (!uid) throw new Error('Missing vtuber uid');
  if (!file) throw new Error('Missing banner file');
  assertValidFile(file, { imagesOnly: true });
  const ext = normalizeImageExtension(getFileExtension(file.name));
  const path = `vtubers/${uid}/banner.${ext}`;
  if (USE_EMULATOR) {
    console.log('[StorageService] Using local upload server for banner');
    return uploadFileLocal(file);
  }
  console.log('[StorageService] Using Firebase Storage banner path', path);
  return uploadFileFirebaseToPath(file, path);
}

async function getVtuberBannerUrl(uid) {
  if (!uid || USE_EMULATOR) return null;
  for (const name of VTUBER_BANNER_NAMES) {
    const path = `vtubers/${uid}/${name}`;
    try {
      return await getDownloadURL(ref(storage, path));
    } catch (err) {
      if (err && err.code === 'storage/object-not-found') {
        continue;
      }
      console.warn('[StorageService] banner lookup failed:', path, err);
    }
  }
  return null;
}

export const storageService = {
  uploadFile: async (file) => {
    assertValidFile(file);
    // 根據環境變數決定使用哪種上傳方式
    if (USE_EMULATOR) {
      console.log('[StorageService] Using local upload server');
      return uploadFileLocal(file);
    } else {
      console.log('[StorageService] Using Firebase Storage');
      return uploadFileFirebase(file);
    }
  },
  uploadVtuberBanner: async (uid, file) => uploadVtuberBanner(uid, file),
  getVtuberBannerUrl: async (uid) => getVtuberBannerUrl(uid)
};
