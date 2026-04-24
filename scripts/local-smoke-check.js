#!/usr/bin/env node
const http = require('http');
const admin = require('firebase-admin');

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'v-up-1eeb3';
const HOST = '127.0.0.1';

const requiredPorts = [5173, 5176, 8081, 9099];
const testUsers = [
  { email: 'vtuber.aurora@test.local', type: 'vtuber' },
  { email: 'vtuber.nova@test.local', type: 'vtuber' },
  { email: 'fan.test@test.local', type: 'fan' }
];

function checkPort(port, timeoutMs = 1200) {
  return new Promise((resolve, reject) => {
    const socket = new (require('net').Socket)();
    let done = false;

    const finish = (err) => {
      if (done) return;
      done = true;
      socket.destroy();
      if (err) reject(err);
      else resolve(true);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish());
    socket.once('timeout', () => finish(new Error(`timeout connecting to ${HOST}:${port}`)));
    socket.once('error', (err) => finish(err));
    socket.connect(port, HOST);
  });
}

function requestStatus(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, timeout: 5000 }, (res) => {
      const status = res.statusCode || 0;
      res.resume();
      resolve(status);
    });
    req.on('timeout', () => {
      req.destroy(new Error(`timeout for ${method} ${url}`));
    });
    req.on('error', reject);
    req.end();
  });
}

function assertStatus(name, status, expected) {
  if (!expected.includes(status)) {
    throw new Error(`${name} unexpected HTTP status ${status}, expected ${expected.join('/')}`);
  }
}

async function main() {
  console.log('[smoke] checking local test ports...');
  for (const port of requiredPorts) {
    await checkPort(port);
    console.log(`[smoke] port ok ${HOST}:${port}`);
  }

  console.log('[smoke] checking web routes...');
  assertStatus('index', await requestStatus('http://127.0.0.1:5173/index.html'), [200]);
  assertStatus('auth', await requestStatus('http://127.0.0.1:5173/auth.html'), [200]);
  assertStatus('dashboard', await requestStatus('http://127.0.0.1:5173/dashboard.html'), [200]);
  assertStatus('public profile', await requestStatus('http://127.0.0.1:5173/vtuber_profile.html?id=auroramizu'), [200]);
  assertStatus('fan profile', await requestStatus('http://127.0.0.1:5173/fan_profile.html'), [200]);
  const uploadPreflight = await requestStatus('http://127.0.0.1:5176/upload', 'OPTIONS');
  assertStatus('upload preflight', uploadPreflight, [200, 204]);

  console.log('[smoke] checking emulator seed data...');
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8081';
  process.env.GCLOUD_PROJECT = PROJECT_ID;
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROJECT_ID });
  }

  const auth = admin.auth();
  const db = admin.firestore();

  for (const u of testUsers) {
    const user = await auth.getUserByEmail(u.email);
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) throw new Error(`[smoke] missing users/${user.uid} for ${u.email}`);
    
    if (u.type === 'vtuber') {
      const vtDoc = await db.collection('vtubers').doc(user.uid).get();
      if (!vtDoc.exists) throw new Error(`[smoke] missing vtubers/${user.uid} for ${u.email}`);
      const handle = vtDoc.data().handle;
      const handleDoc = await db.collection('handles').doc(handle).get();
      if (!handleDoc.exists) throw new Error(`[smoke] missing handles/${handle} for ${u.email}`);
    }
  }

  const ms = await db.collection('milestones').doc('ms_demo_aurora').get();
  if (!ms.exists) throw new Error('[smoke] missing milestones/ms_demo_aurora');
  if (ms.data().status !== 'published') {
    throw new Error(`[smoke] milestones/ms_demo_aurora unexpected status ${ms.data().status}`);
  }

  console.log('[smoke] all checks passed.');
}

main().catch((err) => {
  console.error('[smoke] failed:', err && err.message ? err.message : err);
  process.exit(1);
});
