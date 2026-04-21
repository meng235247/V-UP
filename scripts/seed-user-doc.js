#!/usr/bin/env node
const admin = require('firebase-admin');

const email = process.argv[2] || 'vupexplosion@gmail.com';
const role = process.argv[3] || 'vtuber';
const displayNameArg = process.argv[4] || null;

if (!process.env.FIRESTORE_EMULATOR_HOST) process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8081';
if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';

const projectId = process.env.FIREBASE_PROJECT || process.env.GCLOUD_PROJECT || 'v-up-1eeb3';
console.log('[seed-user-doc] projectId=', projectId, 'email=', email, 'role=', role);

admin.initializeApp({ projectId });
const auth = admin.auth();
const db = admin.firestore();

async function run() {
  try {
    const user = await auth.getUserByEmail(email);
    const uid = user.uid;
    console.log('[seed-user-doc] Found user uid=', uid);

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      const displayName = displayNameArg || user.displayName || email.split('@')[0];
      await userRef.set({
        uid,
        email,
        role,
        displayName,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('[seed-user-doc] Created users doc for', uid);
    } else {
      console.log('[seed-user-doc] users doc already exists for', uid);
    }

    // If vtuber role, optionally create a vtubers profile with same uid
    if (role === 'vtuber') {
      const vtRef = db.collection('vtubers').doc(uid);
      const vtSnap = await vtRef.get();
      if (!vtSnap.exists) {
        const displayName = displayNameArg || user.displayName || email.split('@')[0];
        const handle = (displayName || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]+/g, '_');
        await vtRef.set({
          id: uid,
          displayName,
          handle,
          avatarUrl: `https://i.pravatar.cc/150?u=${uid}`,
          colorPrimary: '#ec4899',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('[seed-user-doc] Created vtuber profile for', uid);
      } else {
        console.log('[seed-user-doc] vtuber profile already exists for', uid);
      }
    }

    // Print back the user profile for verification
    const finalUserSnap = await userRef.get();
    console.log('[seed-user-doc] users doc data:', finalUserSnap.exists ? JSON.stringify(finalUserSnap.data(), null, 2) : 'missing');

    process.exit(0);
  } catch (err) {
    console.error('[seed-user-doc] Error:', err.message || err);
    process.exit(1);
  }
}

run();
