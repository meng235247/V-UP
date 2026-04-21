// Simple storage service abstraction
// - Local mode: POST base64 JSON to local upload server (scripts/local-upload-server.js)
// - Later: swap to Cloudinary or Firebase Storage by changing provider implementation

const UPLOAD_SERVER = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_UPLOAD_SERVER_URL) ? import.meta.env.VITE_UPLOAD_SERVER_URL : 'http://127.0.0.1:5176';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

async function uploadFileLocal(file) {
  const dataUrl = await fileToBase64(file);
  // dataUrl === 'data:<mime>;base64,<base64data>'
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
  return json.url; // full URL to uploaded file
}

export const storageService = {
  uploadFile: uploadFileLocal
};

// Future provider example (Cloudinary) - implement when ready
// export async function uploadFileCloudinary(file) { ... }
