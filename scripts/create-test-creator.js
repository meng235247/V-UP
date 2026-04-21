// scripts/create-test-creator.js
// Create a test creator account in the local Firebase emulators (Auth + Firestore)

// Ensure emulator env vars (defaults match project firebase-config.js)
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8081';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
// Must match VITE_FIREBASE_PROJECT_ID from .env
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'v-up-1eeb3';

const admin = require('firebase-admin');

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });

const auth = admin.auth();
const db = admin.firestore();

async function createTestCreator() {
  try {
    const email = 'creator@test.local';
    const password = 'TestPass123!';
    const displayName = 'Test Creator';

    // Create auth user (or reuse if exists)
    let user;
    try {
      user = await auth.createUser({ email, password, displayName });
      console.log('[create-test-creator] Auth user created:', user.uid);
    } catch (err) {
      if (err.code === 'auth/email-already-exists' || (err.message && /already exists/.test(err.message))) {
        user = await auth.getUserByEmail(email);
        console.log('[create-test-creator] Auth user already exists:', user.uid);
      } else {
        throw err;
      }
    }

    const uid = user.uid;

    // Write 'users' document
    const userDoc = {
      uid,
      email,
      role: 'vtuber',
      displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.doc(`users/${uid}`).set(userDoc, { merge: true });
    console.log('[create-test-creator] users doc created/updated.');

    // Write 'vtubers' profile document (id = uid)
    const vtuberProfile = {
      uid,
      name: 'Test Creator',
      subtitle: '測試創作者',
      bio: '本為本地測試用之創作者帳號。',
      avatarUrl: '',
      bannerUrl: '',
      tags: ['test','creator'],
      themeColor: '#00aaff',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.doc(`vtubers/${uid}`).set(vtuberProfile, { merge: true });
    console.log('[create-test-creator] vtubers doc created/updated.');

    console.log('[create-test-creator] Done.');
    console.log('Credentials -> email:', email, ' password:', password);
  } catch (err) {
    console.error('[create-test-creator] Error:', err);
    process.exitCode = 1;
  }
}

createTestCreator();
