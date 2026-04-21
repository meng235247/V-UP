#!/usr/bin/env node
const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT || process.env.GCLOUD_PROJECT || 'v-up-1eeb3';
console.log('Seeding emulator for project', projectId);

// Initialize Admin SDK (when emulators are active, this will connect to them)
admin.initializeApp({ projectId });
const auth = admin.auth();
const db = admin.firestore();

async function run() {
  try {
    // Create vtuber auth user
    try {
      await auth.getUser('vtuber123');
      console.log('User vtuber123 already exists');
    } catch (e) {
      await auth.createUser({ uid: 'vtuber123', email: 'vtuber@example.test', password: 'password123', displayName: 'VTuber 123' });
      console.log('Created auth user vtuber123 / vtuber@example.test');
    }

    // Seed vtuber profile
    await db.collection('vtubers').doc('vtuber123').set({
      id: 'vtuber123',
      displayName: 'VTuber 123',
      handle: 'vtuber123',
      avatarUrl: 'https://i.pravatar.cc/150?u=vtuber123',
      colorPrimary: '#ec4899'
    });
    console.log('Seeded vtuber profile vtuber123');

    // Seed published milestone
    const msRef = db.collection('milestones').doc('ms_demo');
    await msRef.set({
      vtuberId: 'vtuber123',
      title: 'Demo Milestone',
      desc: '這是一個測試公開里程碑',
      status: 'published',
      targetAmount: 1000,
      currentAmount: 200,
      totalSupporters: 3,
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Seeded milestone ms_demo');

    console.log('Seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed', err);
    process.exit(1);
  }
}

run();
