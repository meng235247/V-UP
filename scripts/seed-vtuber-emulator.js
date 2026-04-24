#!/usr/bin/env node
const admin = require('firebase-admin');

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
if (!process.env.FIRESTORE_EMULATOR_HOST) process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8081';
if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = 'v-up-1eeb3';

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const auth = admin.auth();
const db = admin.firestore();

const users = [
  {
    email: 'vtuber.aurora@test.local',
    password: 'VtuberTest123!',
    displayName: 'Aurora Mizu',
    handle: 'auroramizu',
    colorPrimary: '#ff4f8b',
    role: 'vtuber'
  },
  {
    email: 'vtuber.nova@test.local',
    password: 'VtuberTest123!',
    displayName: 'Nova Kaze',
    handle: 'novakaze',
    colorPrimary: '#4f9dff',
    role: 'vtuber'
  },
  {
    email: 'fan.test@test.local',
    password: 'FanTest123!',
    displayName: 'Test Fan',
    role: 'fan'
  }
];

async function ensureUser(u) {
  let user;
  try {
    user = await auth.getUserByEmail(u.email);
  } catch (e) {
    if (String(e.code).includes('user-not-found')) {
      user = await auth.createUser({
        email: u.email,
        password: u.password,
        displayName: u.displayName,
        emailVerified: true
      });
    } else {
      throw e;
    }
  }

  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    email: u.email,
    role: u.role || 'vtuber',
    displayName: u.displayName,
    isPublic: true,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  if (u.role !== 'fan') {
    await db.collection('vtubers').doc(user.uid).set({
      uid: user.uid,
      id: user.uid,
      displayName: u.displayName,
      name: u.displayName,
      handle: u.handle,
      bio: `${u.displayName} emulator profile`,
      avatarUrl: `https://i.pravatar.cc/300?u=${user.uid}`,
      colorPrimary: u.colorPrimary,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await db.collection('handles').doc(u.handle).set({ uid: user.uid }, { merge: true });
    return { uid: user.uid, email: u.email, handle: u.handle };
  }

  return { uid: user.uid, email: u.email, role: 'fan' };
}

async function seedDemoMilestone(owner) {
  const milestoneRef = db.collection('milestones').doc('ms_demo_aurora');
  await milestoneRef.set({
    vtuberId: owner.uid,
    title: 'Aurora Demo Milestone',
    desc: 'Emulator seeded milestone for manual QA',
    status: 'published',
    targetAmount: 5000,
    currentAmount: 0,
    totalSupporters: 0,
    publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await milestoneRef.collection('posts').doc('post_public_demo').set({
    milestoneId: 'ms_demo_aurora',
    vtuberId: owner.uid,
    title: 'Welcome Public Post',
    content: 'This is a seeded public post from emulator.',
    visibility: 'public',
    isExclusive: false,
    attachments: [],
    primaryMediaType: 'text',
    allowedUids: [],
    status: 'published',
    publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

(async () => {
  const created = [];
  for (const u of users) {
    created.push(await ensureUser(u));
  }
  await seedDemoMilestone(created[0]);
  console.log(JSON.stringify({ created }, null, 2));
  process.exit(0);
})().catch((err) => {
  console.error('[seed-vtuber-emulator] failed:', err);
  process.exit(1);
});
