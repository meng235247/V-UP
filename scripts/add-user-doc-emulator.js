#!/usr/bin/env node
const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT || process.env.GCLOUD_PROJECT || 'v-up-1eeb3';
console.log('Adding user document to emulator for project', projectId);

admin.initializeApp({ projectId });
const db = admin.firestore();

async function run() {
  try {
    const userRef = db.collection('users').doc('vtuber123');
    await userRef.set({
      uid: 'vtuber123',
      email: 'vtuber@example.test',
      role: 'vtuber',
      displayName: 'VTuber 123',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log('Created users/vtuber123 (role: vtuber)');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create users doc:', err);
    process.exit(1);
  }
}

run();
